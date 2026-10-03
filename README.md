# School Management System

A full-stack web application for running a school day to day. Four kinds of users (Admin, Teacher, Student and Parent) each log in and see only what they are allowed to see.

Built with React, Node.js/Express and PostgreSQL. Fully responsive, so it works on phones as well as desktops.

## Demo

- **Demo video:** _add your link here (YouTube unlisted or Google Drive)_
- **Screenshots:** _add a few images here, for example `docs/screenshots/dashboard.png`_

## Features

### Admin
- Manage classes, subjects, teachers, parents and students
- Assign subjects and teachers to each class ("Class setup")
- Build the weekly timetable; the system blocks overlapping lessons for a class or a teacher
- Create exams for a class
- Create fees for one student or a whole class, record payments (full or partial), and see totals, balances and overdue fees
- Post announcements to everyone, teachers, students or parents
- Dashboard with school-wide counts, today's attendance and fee totals

### Teacher
- Take attendance for the classes they teach, with a one-click "mark all present"
- Enter exam marks, but only for the subjects they teach in each class
- See their own weekly timetable
- Post announcements to students or parents
- Dashboard with today's lessons and attendance still to be taken

### Student and Parent
- View timetable, attendance (with percentage), exam results with grades, and fees with payment history
- A parent with several children can switch between them
- Receive announcements and in-app notifications (bell with unread count)
- Dashboard with attendance, fee balance and today's lessons

## Tech stack

| Part | Technology |
| --- | --- |
| Frontend | React 19, Vite, Tailwind CSS 4, React Router |
| Backend | Node.js, Express |
| Database | PostgreSQL with Prisma ORM (driver adapter `@prisma/adapter-pg`) |
| Authentication | JSON Web Tokens (JWT), passwords hashed with bcrypt |
| Security | helmet, express-rate-limit, restricted CORS |
| Version control | Git |

## Project structure

```
school-management/
├── backend/
│   ├── prisma/            database schema and migrations
│   └── src/
│       ├── server.js      app setup, security middleware, routes
│       ├── lib/           Prisma client
│       ├── middleware/    login check and role check
│       ├── routes/        one file per module
│       └── scripts/       createAdmin.js
└── frontend/
    └── src/
        ├── api.js         the single place that talks to the backend
        ├── AuthContext.jsx
        ├── components/    layout, modal, notification bell, route guard
        └── pages/         admin/, teacher/, student/ and shared pages
```

## Getting started

### Prerequisites

- Node.js 22 or newer (developed on Node 24)
- PostgreSQL
- Git

### 1. Clone the project

```
git clone https://github.com/webdeveloper-Quratulain/school-management-system.git
cd school-management-system
```

### 2. Create the database

```
psql -U postgres -h localhost -c "CREATE DATABASE school_db;"
```

### 3. Set up the backend

```
cd backend
npm install
```

Create a file named `.env` in the `backend` folder. Copy `.env.example` and fill in your own values (see the table below).

Generate a strong secret for `JWT_SECRET`:

```
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Then create the tables, generate the database client, create the first admin and start the server:

```
npx prisma migrate deploy
npx prisma generate
npm run create-admin
npm run dev
```

The API runs at `http://localhost:5000`. Check it at `http://localhost:5000/api/health`.

### 4. Set up the frontend

In a second terminal:

```
cd frontend
npm install
```

Create `frontend/.env` (see `.env.example`):

```
VITE_API_URL=http://localhost:5000/api
```

```
npm run dev
```

Open `http://localhost:5173` and log in with the admin email and password you put in the backend `.env`.

### 5. Add your data

Everything is done from the admin screens. A sensible order is:

1. Classes and Subjects
2. Teachers and Parents
3. Students (linked to a class and a parent)
4. Class setup (subject and teacher for each class)
5. Timetable, Exams and Fees

You can remove `ADMIN_PASSWORD` from the backend `.env` once the admin has been created.

## Environment variables

### backend/.env

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Random secret, at least 32 characters. The server refuses to start without it |
| `PORT` | No | Defaults to 5000 |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | For `create-admin` | Details of the first admin |
| `CORS_ORIGIN` | In production | Address of the frontend; several can be separated by commas |
| `TRUST_PROXY` | When behind a proxy | Number of proxies, for example `1` |
| `NODE_ENV` | In production | Set to `production` |

### frontend/.env

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | Address of the backend API. Never put secrets in this file, because it is visible in the browser |

## Roles and permissions

| Area | Admin | Teacher | Student | Parent |
| --- | --- | --- | --- | --- |
| People, classes, subjects, class setup | Full | None | None | None |
| Timetable | Edit | Own lessons | Own class | Child's class |
| Attendance | All classes | Mark and view own classes | Own record | Own children |
| Exams and marks | Create exams, enter any marks | Enter marks for own subjects | Own results | Own children |
| Fees and payments | Full | None | Own fees | Own children |
| Announcements | Post to anyone | Post to students or parents | Read | Read |

These rules are enforced by the API on every request, not only hidden in the interface.

## API overview

All routes are under `/api` and, except login and health, need a valid token.

| Route | Purpose |
| --- | --- |
| `/auth` | Login, current user |
| `/classes`, `/subjects`, `/class-subjects` | School structure |
| `/teachers`, `/parents`, `/students` | People |
| `/attendance` | Mark and view attendance, per-student history and summary |
| `/exams` | Exams, marks entry, results, student report card |
| `/fees` | Fees, bulk fees, payments, summary |
| `/timetable` | Lessons, class timetable, own timetable |
| `/announcements`, `/notifications` | Announcements and the notification inbox |
| `/dashboard` | Role-specific dashboard data |
| `/health` | Server and database status |

## Key rules in the system

- **Attendance** is one record per student per day. Saving again corrects it. Present and late days both count as attended.
- **Grades** are calculated by the server: A+ at 90% and above, A 80, B 70, C 60, D 50, E 40, F below 40. Change `gradeFor` in `backend/src/routes/exams.js` to use a different scale.
- **Money** is calculated in whole cents to avoid rounding errors. A payment can never exceed the balance, the fee status (unpaid, partial, paid) is calculated automatically, and payments cannot be edited or deleted.
- **Timetable** lessons cannot overlap for the same class or the same teacher.
- **People are never deleted.** Deactivating a teacher, student or parent blocks their login but keeps their attendance, marks and fee history.

## Security

- Passwords are hashed with bcrypt, and wrong-email and wrong-password logins take the same time and give the same message
- JWT tokens expire after one day, and every request re-checks that the account is still active and its current role
- Role checks run on every API route
- Failed logins are rate limited (8 per account and 100 per network every 15 minutes) and the whole API is rate limited
- Security headers through helmet, CORS limited to the frontend, request size limit
- Input is validated on the server for dates, money amounts, marks and statuses

## Known limitations

Being honest about what is not included yet:

- No online payment gateway: fees are recorded manually by the admin
- No SMS or email notifications: notifications appear inside the app only
- Single school only (no multiple campuses)
- No change-password or reset-password screen yet
- Announcements go to a whole group, not to a single class
- No automated tests yet; the system has been tested manually
- The login token is stored in the browser's `localStorage`
- Rate-limit counters are kept in memory and reset when the server restarts
- `npm audit` reports advisories in Prisma's command-line tooling (not in the code that serves requests); update Prisma when a patched release is available

## Scripts

### Backend

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the server and restart on changes |
| `npm run start` | Start the server |
| `npm run create-admin` | Create the first admin from the `.env` values |

### Frontend

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run lint` | Check the code with ESLint |

## Author

Quratulain
