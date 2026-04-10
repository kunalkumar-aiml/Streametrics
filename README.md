# OTT Platform DBMS Mini Project

A complete full-stack DBMS mini project for university submission, simulating an OTT platform (Netflix/Prime style).

## Project Structure

- `frontend/`
  - `login.html`
  - `dashboard.html`
  - `style.css`
  - `script.js`
- `backend/`
  - `server.js`
  - `db.js`
  - `routes/`
  - `controllers/`
  - `.env.example`
- `database/`
  - `database_setup.sql`
- `docs/`
  - `ER_diagram.png`
  - `er_diagram.mmd`
  - `documentation.md`

## Quick Start

```bash
cd backend
cp .env.example .env
# edit DB credentials in .env
npm install
npm start
```

Run SQL setup file in MySQL:

```sql
SOURCE /absolute/path/to/ott-dbms-mini-project/database/database_setup.sql;
```

If `mysql` CLI is not in PATH, use the built-in Node initializer:

```bash
cd /Users/kunal/ott-dbms-mini-project/backend
npm run db:init
```

Or use the direct macOS binary path (if installed there):

```bash
/usr/local/mysql/bin/mysql -u root -p -e "SOURCE /Users/kunal/ott-dbms-mini-project/database/database_setup.sql;"
```

Then open:
- `http://localhost:5000/login.html`

Login credentials:
- Username: `9341806005`
- Password: `9341806005`
