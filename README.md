# GramSetu — Household Socio-Economic Survey Portal

A full-stack, mobile-responsive e-governance style portal for conducting a
household socio-economic survey, modeled on India's SECC / BPL survey and
Public Distribution System (ration card) forms. Field agents visit
households and record details (assets owned, income, ration card type,
category, etc.); administrators review, correct, and manage the data.

## Tech stack

- **Frontend:** React 19 (Vite), React Router, Axios, plain responsive CSS
- **Backend:** Node.js, Express, JWT auth, bcrypt password hashing
- **Database:** SQLite (file-based, via `better-sqlite3`) — zero setup required

## Project structure

```
Demo-Krishna/
├── server/       Express API + SQLite database
│   └── src/
│       ├── db/          schema + connection + seed script
│       ├── middleware/  JWT auth + role guard
│       └── routes/      auth, surveys, agents
└── client/       React (Vite) frontend
    └── src/
        ├── api/         axios instance
        ├── context/     auth context
        ├── components/  shared UI (form, layout, nav, pagination, etc.)
        ├── pages/       login, register, dashboard, survey list/add/edit/view, agents, profile
        └── styles/      global responsive stylesheet
```

## Roles

| Role  | Can view records | Can add records | Can edit records | Can delete records | Extra |
|-------|:---:|:---:|:---:|:---:|---|
| Agent | ✅ | ✅ | ❌ | ❌ | Once a survey is submitted it is locked — only an admin can correct it. |
| Admin | ✅ | ✅ | ✅ | ✅ | Manages field agent accounts (activate/deactivate) on the "Field Agents" screen. |

## Getting started

```bash
# from the repo root
npm run install:all   # installs server + client dependencies
npm run seed           # creates the SQLite DB and two demo accounts
npm run dev             # starts the API (port 5000) and the Vite client (port 5173)
```

Then open **http://localhost:5173**.

### Demo credentials

| Role  | Email | Password |
|-------|-------|----------|
| Admin | admin@gramsetu.gov.in | Admin@123 |
| Agent | agent@gramsetu.gov.in | Agent@123 |

New field agents can also self-register from the **Register** link on the
login page (registration always creates an `agent` account; admin accounts
are provisioned via the seed script / database directly, as is typical for
a government back-office portal).

## Screens

- **Login** — with demo credentials shown for convenience
- **Register** (field agents)
- **Forgot Password** / **Reset Password** — since this demo has no email/SMS
  gateway wired up, the reset token is returned directly in the API response
  and auto-filled on the reset screen (see `server/src/routes/auth.js` for
  where a real integration would send it by email/SMS instead)
- **Dashboard** — totals, category / ration-card breakdowns, asset-ownership stats
- **Household Records** (list) — search, filter by category/ration card, pagination,
  responsive card layout on mobile
- **New Survey Entry** — the full household survey form
- **Household Record Details** (read-only view)
- **Edit Household Record** (admin only)
- **Field Agents** (admin only) — see each agent's submission count, activate/deactivate
- **My Profile**

## Survey fields captured

Personal details, Aadhaar/mobile/email, full address (state/district/block/
village/pincode), social category, religion, ration card type (APL/BPL/AAY),
house type & ownership, family size, monthly income, occupation, land owned,
government scheme availed, and household assets: two-wheeler, four-wheeler,
refrigerator, TV, AC, LPG gas connection, washing machine, computer/laptop,
smartphone, water pump, and bank account (with bank name/account number).

## Notes on the database

The SQLite file lives at `server/data/gramsetu.db` and is created
automatically on first run. Delete it and re-run `npm run seed` to start
fresh.
