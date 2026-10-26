# Expense Tracker

A phone-friendly monthly expense tracker. Say “spesa 23 euro e 50” and it becomes a 23,50 € Groceries expense.

- **Backend**: FastAPI + SQLite (`backend/`)
- **Frontend**: React + Vite + Tailwind CSS v4 + lucide icons (`frontend/`), served by nginx, which also forwards `/api` to the backend
- **Voice**: the browser's speech recognition (Chrome / Edge / Safari, including on phones). The phrase is parsed server-side into amount + description + category (Italian by default, plus French and English; digits or words: “ventitré euro e cinquanta”, “quatre-vingt-dix euros d'essence”, “twelve euros for lunch”). Switch language with the IT/FR/EN button in the header. You always confirm before saving. Firefox has no speech recognition, so type the phrase in the same box instead.

## Run

```bash
cp .env.example .env        # then set JWT_SECRET (openssl rand -base64 48) and the password
docker compose up -d --build
```

The app listens on `http://<host>:8095` (`HTTP_PORT` in `.env`). Point your nginx reverse proxy for `tracker.bligny44.site` at it:

```nginx
location / {
    proxy_pass http://127.0.0.1:8095;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

The microphone only works over **HTTPS**, which Cloudflare and your proxy provide.

Default login: `admin` / `admin`. Change it with `ADMIN_USER` / `ADMIN_PASSWORD` in `.env`.

## Data & backup

Expenses live in the `expenses-tracker_expenses-data` Docker volume (`/data/expenses.db`).

```bash
docker compose cp backend:/data/expenses.db ./backup-expenses.db
```

## Categories

Manage categories from the tag icon in the header. Each category has **voice keywords**: comma-separated words that select it automatically when you speak them.

## Development

```bash
cd backend && pip install -r requirements.txt && DATABASE_URL=sqlite:///./dev.db uvicorn app.main:app --port 9000 --reload
cd frontend && npm install && npm run dev   # proxies /api to :9000
```

API docs: `/api/docs`.
