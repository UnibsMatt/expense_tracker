from contextlib import asynccontextmanager
from datetime import date as Date

from fastapi import Depends, FastAPI, HTTPException, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import extract, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .auth import check_credentials, create_token, current_user
from .db import Category, Expense, get_db, init_db
from .parser import parse_expense


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="Expense Tracker", lifespan=lifespan, docs_url="/api/docs",
              openapi_url="/api/openapi.json")


# ---------- Schemas ----------

class LoginIn(BaseModel):
    username: str
    password: str


class CategoryIn(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    icon: str = Field(default="tag", max_length=30)
    color: str = Field(default="slate", max_length=20)
    keywords: str = Field(default="", max_length=500)


class CategoryOut(CategoryIn):
    id: int


class ExpenseIn(BaseModel):
    amount: float = Field(gt=0, le=1_000_000)
    description: str = Field(default="", max_length=200)
    date: Date
    category_id: int | None = None

    @field_validator("description")
    @classmethod
    def strip(cls, v: str) -> str:
        return v.strip()


class ExpenseOut(BaseModel):
    id: int
    amount: float
    description: str
    date: Date
    category_id: int | None


class ParseIn(BaseModel):
    text: str = Field(min_length=1, max_length=500)
    lang: str = "it"


def to_out(e: Expense) -> ExpenseOut:
    return ExpenseOut(id=e.id, amount=e.amount_cents / 100, description=e.description,
                      date=e.date, category_id=e.category_id)


def month_filter(q, month: str):
    try:
        year, mon = (int(x) for x in month.split("-"))
    except ValueError:
        raise HTTPException(422, "month must be YYYY-MM")
    return q.filter(extract("year", Expense.date) == year, extract("month", Expense.date) == mon)


# ---------- Routes ----------

@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/auth/login")
def login(body: LoginIn):
    if not check_credentials(body.username, body.password):
        raise HTTPException(401, "Wrong username or password")
    return {"access_token": create_token(body.username), "token_type": "bearer"}


@app.get("/api/auth/me")
def me(user: str = Depends(current_user)):
    return {"username": user}


@app.get("/api/categories", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db), _: str = Depends(current_user)):
    return db.query(Category).order_by(Category.id).all()


@app.post("/api/categories", response_model=CategoryOut, status_code=201)
def create_category(body: CategoryIn, db: Session = Depends(get_db), _: str = Depends(current_user)):
    cat = Category(**body.model_dump())
    db.add(cat)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "A category with this name already exists")
    return cat


@app.put("/api/categories/{cat_id}", response_model=CategoryOut)
def update_category(cat_id: int, body: CategoryIn, db: Session = Depends(get_db),
                    _: str = Depends(current_user)):
    cat = db.get(Category, cat_id)
    if not cat:
        raise HTTPException(404, "Category not found")
    for k, v in body.model_dump().items():
        setattr(cat, k, v)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "A category with this name already exists")
    return cat


@app.delete("/api/categories/{cat_id}", status_code=204)
def delete_category(cat_id: int, db: Session = Depends(get_db), _: str = Depends(current_user)):
    cat = db.get(Category, cat_id)
    if not cat:
        raise HTTPException(404, "Category not found")
    db.query(Expense).filter(Expense.category_id == cat_id).update({Expense.category_id: None})
    db.delete(cat)
    db.commit()


@app.get("/api/expenses", response_model=list[ExpenseOut])
def list_expenses(month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
                  db: Session = Depends(get_db), _: str = Depends(current_user)):
    q = month_filter(db.query(Expense), month)
    return [to_out(e) for e in q.order_by(Expense.date.desc(), Expense.id.desc()).all()]


@app.get("/api/summary")
def summary(month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
            db: Session = Depends(get_db), _: str = Depends(current_user)):
    q = month_filter(db.query(Expense.category_id, func.sum(Expense.amount_cents),
                              func.count(Expense.id)), month)
    rows = q.group_by(Expense.category_id).all()
    by_cat = [{"category_id": c, "total": s / 100, "count": n} for c, s, n in rows]
    by_cat.sort(key=lambda r: r["total"], reverse=True)
    return {"month": month, "total": sum(r["total"] for r in by_cat), "by_category": by_cat}


def _save(e: Expense, body: ExpenseIn, db: Session) -> Expense:
    if body.category_id is not None and not db.get(Category, body.category_id):
        raise HTTPException(422, "Unknown category")
    e.amount_cents = round(body.amount * 100)
    e.description = body.description
    e.date = body.date
    e.category_id = body.category_id
    db.add(e)
    db.commit()
    return e


@app.post("/api/expenses", response_model=ExpenseOut, status_code=201)
def create_expense(body: ExpenseIn, db: Session = Depends(get_db), _: str = Depends(current_user)):
    return to_out(_save(Expense(), body, db))


@app.put("/api/expenses/{exp_id}", response_model=ExpenseOut)
def update_expense(exp_id: int, body: ExpenseIn, db: Session = Depends(get_db),
                   _: str = Depends(current_user)):
    e = db.get(Expense, exp_id)
    if not e:
        raise HTTPException(404, "Expense not found")
    return to_out(_save(e, body, db))


@app.delete("/api/expenses/{exp_id}", status_code=204)
def delete_expense(exp_id: int, db: Session = Depends(get_db), _: str = Depends(current_user)):
    e = db.get(Expense, exp_id)
    if not e:
        raise HTTPException(404, "Expense not found")
    db.delete(e)
    db.commit()


@app.post("/api/parse")
def parse(body: ParseIn, db: Session = Depends(get_db), _: str = Depends(current_user)):
    return parse_expense(body.text, db.query(Category).all(), body.lang)
