# GramSetu — Household Survey Portal (Bhubaneswar, Odisha)

A full-stack, mobile-responsive e-governance style portal for conducting a
household socio-economic survey of Bhubaneswar, Odisha. Field agents visit
households and record details (assets owned, income, ration card type,
category, government schemes availed, etc.); administrators review, correct,
and manage the data. Location fields, ration card categories, and government
scheme lists are tailored to Odisha (Khordha district / Bhubaneswar Municipal
Corporation area).

## Tech stack

- **Frontend:** React 19 (Vite), React Router, Axios, plain responsive CSS
- **Backend:** Node.js, Express, JWT auth, bcrypt password hashing
- **Database:** SQLite, via [libSQL](https://turso.tech/libsql) (`@libsql/client`) — a local file with zero setup for
  development, or a free [Turso](https://turso.tech) cloud database for persistent production hosting (see
  "Database" below)

## Project structure

```
Demo-Krishna/
├── server/       Express API + SQLite database
│   └── src/
│       ├── db/          schema + connection + seed script
│       ├── middleware/  JWT auth + role guard
│       ├── utils/       reporting-hierarchy helpers (visibility scoping)
│       └── routes/      auth, surveys, users
└── client/       React (Vite) frontend
    └── src/
        ├── api/         axios instance
        ├── context/     auth context
        ├── components/  shared UI (form, layout, nav, pagination, etc.)
        ├── pages/       login, register, dashboard, survey list/add/edit/view, team, profile
        └── styles/      global responsive stylesheet
```

## Roles & hierarchy

Five roles, top to bottom:

```
Developer -> Admin -> Head of District -> Head of Panchayat -> Field Agent
```

Every user (other than Developer/Admin) reports to exactly one user above
them (`users.parent_id`), forming a tree: many Field Agents under one Head
of Panchayat, many Heads of Panchayat under one Head of District.

| Role | Can view records | Can add records | Can edit/delete records | Can view users | Extra |
|------|:---:|:---:|:---:|:---:|---|
| Field Agent | Own only | ✅ | ❌ | — | Once a survey is submitted it is locked — only an admin/developer can correct it. |
| Head of Panchayat | Own team's (their Field Agents) | ✅ | ❌ | Own team | Cannot see other Heads of Panchayat's teams. |
| Head of District | Own team's (their Heads of Panchayat + those Field Agents) | ✅ | ❌ | Own team | Cannot see other Heads of District's teams. |
| Admin | Everyone's | ✅ | ✅ | Everyone | Manages user accounts (activate/deactivate) on the "Team Directory" screen. |
| Developer | Everyone's | ✅ | ✅ | Everyone | The **only** role that can register new accounts, at any level of the hierarchy. |

There is no public self-registration — a Developer creates every account
(Head of District, Head of Panchayat, Field Agent, Admin, or another
Developer) from the **Register New User** screen, picking who it reports to.

## Getting started

```bash
# from the repo root
npm run install:all   # installs server + client dependencies
npm run seed           # creates the SQLite DB and demo accounts for each role
npm run dev             # starts the API (port 5000) and the Vite client (port 5173)
```

Then open **http://localhost:5173**.

### Demo credentials

| Role | Email | Password |
|------|-------|----------|
| Developer | developer@gramsetu.gov.in | Developer@123 |
| Admin | admin@gramsetu.gov.in | Admin@123 |
| Head of District | district.head@gramsetu.gov.in | District@123 |
| Head of Panchayat | panchayat.head@gramsetu.gov.in | Panchayat@123 |
| Field Agent | agent@gramsetu.gov.in | Agent@123 |

## Screens

- **Login** — with demo credentials shown for convenience, and a show/hide
  toggle on the password field
- **Register New User** (developer only) — create an account for any role
  and assign who it reports to
- **Forgot Password** / **Reset Password** — since this demo has no email/SMS
  gateway wired up, the reset token is returned directly in the API response
  and auto-filled on the reset screen (see `server/src/routes/auth.js` for
  where a real integration would send it by email/SMS instead)
- **Dashboard** — totals, category / ration-card breakdowns, asset-ownership
  stats, scoped to what the signed-in user's hierarchy can see
- **Household Records** (list) — search, filter by category/ration card, pagination,
  responsive card layout on mobile, scoped to the user's hierarchy
- **New Survey Entry** — the full household survey form
- **Household Record Details** (read-only view)
- **Edit Household Record** (admin/developer only)
- **Government Schemes** — a reference list of Central and Odisha State schemes
- **Team Directory** (developer/admin/Head of District/Head of Panchayat) —
  see each user beneath you and their submission count, activate/deactivate
- **My Profile**

## Survey fields captured

Personal details, Aadhaar/mobile/email, full address (state/district defaulting
to Odisha/Khordha, block/tehsil/BMC ward, city-town-village with Bhubaneswar
locality suggestions, pincode), social category (General/SEBC/SC/ST/EWS —
Odisha's official terminology), religion, ration card type (AAY/PHH/SFSS/APL —
matching Odisha's actual PDS categories), house type & ownership, family size,
monthly income, occupation (including handloom/handicraft artisan and fishing,
common in Odisha), land owned, government schemes availed (multi-select, see
below), and household assets: two-wheeler, four-wheeler, refrigerator, TV, AC,
LPG gas connection, washing machine, computer/laptop, smartphone, water pump,
and bank account (with bank name/account number).

## Government schemes tracked

The **Government Schemes** page and the survey form's "Government Schemes
Availed" checklist cover:

- **Central schemes:** PM Awas Yojana, PM Kisan Samman Nidhi, Ayushman Bharat
  (PM-JAY), MGNREGA, PM Ujjwala Yojana, PM Jan Dhan Yojana, Atal Pension Yojana,
  PM Jeevan Jyoti/Suraksha Bima Yojana, PM Fasal Bima Yojana, National Social
  Assistance Programme, Swachh Bharat Mission.
- **Odisha state schemes:** KALIA Yojana, Biju Swasthya Kalyan Yojana (BSKY),
  Madhu Babu Pension Yojana (MBPY), Mission Shakti, Biju Pucca Ghar Yojana, Ama
  Gaon Ama Bikash, Biju Gram Jyoti Yojana, Odisha Millet Mission, Gopabandhu
  Gramin Yojana.

Edit `client/src/constants/surveyOptions.js` (`CENTRAL_SCHEMES` /
`ODISHA_SCHEMES`) to add or update schemes.

## Database

Local development needs no setup: `server/src/db/connection.js` opens a local
SQLite file at `server/data/gramsetu.db` (via libSQL's embedded mode) and
creates it automatically on first run. Delete it and re-run `npm run seed` to
start fresh.

**Production (Render) uses a free [Turso](https://turso.tech) cloud database
instead**, so data survives restarts/redeploys — Render's free web services
have an ephemeral filesystem, meaning a local SQLite file there gets wiped on
every restart, redeploy, or after 15 minutes of inactivity. Turso is
SQLite-compatible (no query changes needed) and free forever on its base
tier. To provision one:

```bash
curl -sSfL https://get.tur.so/install.sh | bash   # installs the turso CLI
turso auth login                                   # one-time browser login
turso db create <your-db-name>
turso db show <your-db-name>        # note the libsql:// URL
turso db tokens create <your-db-name>  # generates an auth token
```

Then set `TURSO_DATABASE_URL` (the `libsql://...` URL) and `TURSO_AUTH_TOKEN`
as environment variables on the server (Render dashboard, or
`render.yaml` + the Render CLI/API — see the comments there). With both set,
`server/src/db/connection.js` connects to Turso instead of the local file;
with neither set, it falls back to the local file exactly as before.
