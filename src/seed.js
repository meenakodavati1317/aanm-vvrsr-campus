// Fills MongoDB with the sample college: 3 departments x 6 semesters = 18 classes of 40-60 students,
// one class teacher per class, attendance, internal marks, past-year statistics, notices and gallery items.
//   npm run seed        (wipes the database first)
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { generate } from './data/generate.js';
import User, { hashPassword } from './models/User.js';
import Department from './models/Department.js';
import Subject from './models/Subject.js';
import Student from './models/Student.js';
import Faculty from './models/Faculty.js';
import AttendanceSummary from './models/AttendanceSummary.js';
import AttendanceSession from './models/AttendanceSession.js';
import Mark from './models/Mark.js';
import Notice from './models/Notice.js';
import Media from './models/Media.js';
import YearStat from './models/YearStat.js';
import JoinRequest from './models/JoinRequest.js';
import ActivityLog from './models/ActivityLog.js';

const password = process.env.DEFAULT_PASSWORD || 'demo1234';

async function seed() {
  await connectDB();
  const d = generate();
  console.log('Clearing old data...');
  await Promise.all([User, Department, Subject, Student, Faculty, AttendanceSummary, AttendanceSession, Mark, Notice, Media, YearStat, JoinRequest, ActivityLog].map((m) => m.deleteMany({})));

  const hash = await hashPassword(password); // one shared hash keeps seeding fast

  await Department.insertMany(d.depts.map((x) => ({ code: x.code, name: x.name, hod: x.hod })));
  const subjects = await Subject.insertMany(d.subjects.map((s) => ({ dept: s.dept, sem: s.sem, name: s.name, code: s.code, credits: s.credits })));
  const subjectId = new Map(d.subjects.map((s, i) => [s.key, subjects[i]._id]));

  const students = await Student.insertMany(d.students.map(({ key, ...rest }) => rest));
  const studentId = new Map(d.students.map((s, i) => [s.key, students[i]._id]));

  const faculty = await Faculty.insertMany(d.faculty.map(({ key, subjectKeys, ...rest }) => ({ ...rest, subjects: subjectKeys.map((k) => subjectId.get(k)) })));

  await User.insertMany([
    ...students.map((s) => ({ role: 'student', status: 'active', name: s.name, email: s.email, loginId: s.roll.toLowerCase(), passwordHash: hash, profile: s._id })),
    ...faculty.map((f) => ({ role: 'faculty', status: 'active', name: f.name, email: f.email, loginId: f.code.toLowerCase(), passwordHash: hash, profile: f._id })),
    { role: 'admin', status: 'active', name: d.admin.name, email: d.admin.email, loginId: d.admin.code.toLowerCase(), passwordHash: hash, designation: d.admin.designation, primary: true },
  ]);

  await AttendanceSummary.insertMany(d.attendance.map((a) => ({ student: studentId.get(a.student), subject: subjectId.get(a.subject), held: a.held, attended: a.attended })), { ordered: false });
  await Mark.insertMany(d.marks.map((m) => ({ student: studentId.get(m.student), subject: subjectId.get(m.subject), ia1: m.ia1, ia2: m.ia2, assignment: m.assignment })), { ordered: false });
  await YearStat.insertMany(d.yearStats);

  const day = 86400000;
  await Notice.insertMany(d.notices.map(({ daysAgo, ...n }) => ({ ...n, createdAt: new Date(Date.now() - daysAgo * day), updatedAt: new Date() })), { timestamps: false });
  await Media.insertMany(d.media);
  await ActivityLog.insertMany(d.activity.map(([actor, action], i) => ({ actor, action, createdAt: new Date(Date.now() - (i + 1) * 3600000) })), { timestamps: false });

  // three people who have signed up and are waiting for the admin
  for (const r of d.requests) {
    const base = r.name.toLowerCase().replace(/[^a-z]+/g, '.');
    const user = await User.create({ role: r.role, status: 'pending', name: r.name, email: r.email, loginId: r.email, passwordHash: hash, designation: r.designation });
    await JoinRequest.create({ ...r, user: user._id });
    void base;
  }

  console.log(`Done: ${students.length} students, ${faculty.length} faculty, ${subjects.length} subjects, ${d.depts.length} departments.`);
  console.log('Log in with  student AV23CSE017 / faculty FAC-0231 / admin ADM-0007   password: ' + password);
}

seed().then(() => mongoose.disconnect()).catch((e) => { console.error('Seed failed:', e.message); process.exit(1); });
