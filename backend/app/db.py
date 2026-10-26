from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, create_engine, func, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker

from .config import DATABASE_URL

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True)
    icon: Mapped[str] = mapped_column(String(30), default="tag")
    color: Mapped[str] = mapped_column(String(20), default="slate")
    # Comma-separated words that help voice input pick this category.
    keywords: Mapped[str] = mapped_column(String(500), default="")


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[int] = mapped_column(primary_key=True)
    amount_cents: Mapped[int] = mapped_column(Integer)
    description: Mapped[str] = mapped_column(String(200), default="")
    date: Mapped[date] = mapped_column(Date, index=True)
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    category: Mapped[Category | None] = relationship()


DEFAULT_CATEGORIES = [
    ("Groceries", "shopping-cart", "emerald",
     "courses,supermarché,supermarche,épicerie,epicerie,marché,marche,carrefour,leclerc,lidl,auchan,intermarché,intermarche,boulangerie,pain,grocery,groceries,supermarket,food"),
    ("Restaurant", "utensils", "orange",
     "restaurant,resto,café,cafe,bar,déjeuner,dejeuner,dîner,diner,pizza,burger,kebab,sushi,mcdo,lunch,dinner,coffee,breakfast,bière,biere,beer"),
    ("Transport", "car", "sky",
     "essence,carburant,gasoil,diesel,péage,peage,parking,train,sncf,bus,tram,métro,metro,taxi,uber,voiture,fuel,gas,car,ticket,vélo,velo"),
    ("Housing", "home", "violet",
     "loyer,logement,maison,appartement,rent,house,meuble,ikea,bricolage,leroy"),
    ("Bills", "receipt", "rose",
     "facture,électricité,electricite,edf,eau,internet,box,téléphone,telephone,forfait,assurance,impôt,impot,abonnement,netflix,spotify,bill,bills,subscription,insurance"),
    ("Health", "heart-pulse", "red",
     "pharmacie,médecin,medecin,docteur,dentiste,santé,sante,mutuelle,médicament,medicament,pharmacy,doctor,health"),
    ("Leisure", "gamepad", "amber",
     "cinéma,cinema,ciné,cine,concert,jeu,jeux,sport,sortie,loisir,livre,vacances,game,movie,book,holiday"),
    ("Shopping", "shopping-bag", "pink",
     "vêtements,vetements,habits,chaussures,amazon,cadeau,shopping,clothes,shoes,gift"),
    ("Other", "circle-ellipsis", "slate", ""),
]


# Italian voice keywords, added to existing databases by migration 1.
ITALIAN_KEYWORDS = {
    "Groceries": "spesa,supermercato,alimentari,esselunga,coop,conad,panetteria,panificio,mercato,frutta,verdura",
    "Restaurant": "ristorante,pizzeria,caffè,caffe,cappuccino,cornetto,pranzo,cena,colazione,aperitivo,gelato,birra,trattoria,osteria",
    "Transport": "benzina,carburante,gasolio,autostrada,pedaggio,parcheggio,treno,trenitalia,italo,autobus,biglietto,macchina,auto,metropolitana,metro",
    "Housing": "affitto,casa,mobili,condominio,mutuo",
    "Bills": "bolletta,bollette,luce,acqua,telefono,abbonamento,assicurazione,tasse,ricarica",
    "Health": "farmacia,medico,dottore,dentista,salute,medicine,medicinali,visita",
    "Leisure": "cinema,concerto,gioco,giochi,palestra,libro,libri,vacanza,vacanze,museo,teatro",
    "Shopping": "vestiti,scarpe,regalo,abbigliamento,negozio",
    "Other": "altro,varie",
}


def _merge_keywords(existing: str, extra: str) -> str:
    words = [w.strip() for w in existing.split(",") if w.strip()]
    words += [w for w in extra.split(",") if w not in words]
    return ",".join(words)


def _migrate(db) -> None:
    version = db.execute(text("PRAGMA user_version")).scalar()
    if version < 1:
        for cat in db.query(Category).all():
            if cat.name in ITALIAN_KEYWORDS:
                cat.keywords = _merge_keywords(cat.keywords or "", ITALIAN_KEYWORDS[cat.name])
        db.execute(text("PRAGMA user_version = 1"))
    db.commit()


def init_db() -> None:
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        if db.query(Category).count() == 0:
            for name, icon, color, keywords in DEFAULT_CATEGORIES:
                db.add(Category(name=name, icon=icon, color=color, keywords=keywords))
            db.commit()
        _migrate(db)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
