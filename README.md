# AANM&VVRSR Campus: Smart Campus Management System

A full-stack college portal with three role-based dashboards (admin, faculty, student), sign-up with admin approval, semesters 1 to 6, attendance, internal marks, notices, timetable, past-and-present analytics, and an event photo/video gallery that only admins manage.

**Stack:** Node.js 18+, Express, MongoDB (Mongoose), JWT sign-in, bcrypt password hashing, multer uploads. The frontend is plain HTML, CSS and JavaScript served by the same server (no build step).

## Try it in one minute (no database)

```bash
npm run demo
```

Open http://localhost:5000. This runs a small in-memory server with the same API and the same sample college, using only Node (no `npm install` needed). Data resets when you stop it.

## Run the real project (MongoDB)

1. Install Node.js 18 or newer and MongoDB (or create a free MongoDB Atlas cluster).
2. In this folder:
   ```bash
   npm install
   cp .env.example .env      # on Windows: copy .env.example .env
   ```
3. Edit `.env`: set `MONGO_URI` and put a long random string in `JWT_SECRET`.
4. Load the sample college (wipes the database first), then start:
   ```bash
   npm run seed
   npm start
   ```
5. Open http://localhost:5000 (`npm run dev` restarts on file changes).

## Demo logins (password `demo1234`)

| Role | ID | Notes |
|---|---|---|
| Student | `AV23CSE017` | Aarav Rao, CSE semester 6 |
| Faculty | `FAC-0231` | Dr. Meera Iyer, class teacher of CSE-6 |
| Admin | `ADM-0007` | Registrar, can do everything |

Change `DEFAULT_PASSWORD` in `.env` before seeding, and never use the demo accounts in production.

## What each role can do

**Admin:** dashboard statistics; add, view, update and delete students; add and manage faculty; manage departments, subjects and class teachers; manage attendance and internal marks; publish and delete notices; upload, edit and delete event photos and videos; approve or reject sign-ups; manage the admin team; reports and past-and-present comparison.

**Faculty:** assigned subjects and students; mark attendance (once per subject per day); enter internal marks; student performance; the class they are class teacher of; timetable; notices; events gallery.

**Student:** personal profile; attendance percentage by subject; internal marks; semester-wise results (1 to 6) with CGPA trend; timetable; announcements; events gallery; campus map.

**Sign-up:** new students, faculty and admins register from the login screen. Their account stays *pending* until an admin approves it; approval creates the profile and issues the roll number or faculty/admin ID.

## How the college is modelled

- 3 sample departments (CSE, ECE, ME) x 6 semesters = 18 classes.
- Each semester of a department is **one class of 40 to 60 students** with **one class teacher** (`Faculty.classTeacherOf`, for example `CSE-6`).
- Roll numbers look like `AV23CSE017` (admission year, department, serial).
- Internal marks: IA-1 out of 20, IA-2 out of 20, assignment out of 10.
- Past academic years (2021-22 to 2024-25) are sample history stored in `YearStat`; the current year is always calculated from live attendance and marks.

## Folder structure

```
server.js                 starts Express and connects to MongoDB
src/config/db.js          database connection
src/models/               User, Student, Faculty, Department, Subject, AttendanceSummary,
                          AttendanceSession, Mark, Notice, Media, YearStat, JoinRequest, ActivityLog
src/middleware/           auth (JWT + role check), upload (multer), error handling
src/routes/               auth, bootstrap, students, faculty, academics, attendance, marks,
                          notices, media, requests
src/utils/                serializers, account helpers
src/data/generate.js      sample college used by the seed script and the demo server
src/seed.js               npm run seed
public/                   index.html, styles.css, app.js (the interface)
tools/demo-server.mjs     npm run demo (in-memory, no database)
uploads/                  photos and videos uploaded by admins
```

## API overview

All routes are under `/api`. Everything except `auth` needs `Authorization: Bearer <token>`.

| Method and path | Who | Purpose |
|---|---|---|
| `GET /auth/departments` | public | departments for the sign-up form |
| `POST /auth/register` | public | request a student, faculty or admin account |
| `POST /auth/login` | public | `{role, loginId, password}` returns `{token}` |
| `GET /bootstrap` | any | everything the signed-in person may see (admin: all; faculty: their classes; student: themselves) |
| `POST/PUT/DELETE /students` | admin | manage students |
| `POST/PUT/DELETE /faculty` | admin | manage faculty |
| `POST/DELETE /departments`, `POST/DELETE /subjects`, `PUT /classes/:key/teacher` | admin | academics |
| `POST /attendance/session` | faculty, admin | mark a subject's attendance for today |
| `PUT /attendance/correct` | admin | correct a student's percentage |
| `PUT /marks/bulk` | faculty, admin | save internal marks for a subject |
| `POST/DELETE /notices` | admin | publish and delete notices |
| `POST/PUT/DELETE /media` | admin | event photos and videos (multipart upload) |
| `POST /requests/:id/approve`, `POST /requests/:id/reject`, `DELETE /admins/:id` | admin | approvals and admin team |

Faculty can only mark attendance and enter marks for subjects assigned to them.

## Good to know

- `GET /bootstrap` sends the whole scope in one response. That is fine for a college of about a thousand students; for a much larger college, add pagination.
- Uploaded files are stored on the server's disk in `uploads/`. Back that folder up, or switch `src/middleware/upload.js` to cloud storage for hosting.
- The gallery's sample items use generated artwork. Add real event photos and videos from the admin "Events & media" page.
- The "upcoming events" list and RSVP buttons are static sample content.
- Before going live: set a strong `JWT_SECRET`, serve over HTTPS, change all demo passwords, and consider rate-limiting the login route.
