import { Router } from 'express';
import Department from '../models/Department.js';
import Subject from '../models/Subject.js';
import Student from '../models/Student.js';
import Faculty from '../models/Faculty.js';
import AttendanceSummary from '../models/AttendanceSummary.js';
import AttendanceSession from '../models/AttendanceSession.js';
import Mark from '../models/Mark.js';
import Notice from '../models/Notice.js';
import Media from '../models/Media.js';
import YearStat from '../models/YearStat.js';
import JoinRequest from '../models/JoinRequest.js';
import ActivityLog from '../models/ActivityLog.js';
import User from '../models/User.js';
import { ah } from '../utils/asyncHandler.js';
import { today } from '../utils/accounts.js';
import { sStudent, sFaculty, sSubject, sDept, sNotice, sMedia, sRequest, sAdmin, sHistory, pct, key } from '../utils/serialize.js';

const router = Router();

// GET /api/bootstrap
// One call that returns everything the signed-in person is allowed to see:
//   admin   -> the whole college
//   faculty -> the classes they teach or are class teacher of
//   student -> their own record, plus their class size, class teacher and rank
router.get('/', ah(async (req, res) => {
  const user = req.user;
  const [depts, subjects, facultyDocs, media] = await Promise.all([
    Department.find().sort('code'), Subject.find().sort({ dept: 1, sem: 1, code: 1 }), Faculty.find().sort('code'), Media.find().sort({ year: -1, order: 1, createdAt: -1 }),
  ]);
  const audiences = user.role === 'admin' ? ['All', 'Students', 'Faculty'] : user.role === 'faculty' ? ['All', 'Faculty'] : ['All', 'Students'];
  const notices = await Notice.find({ audience: { $in: audiences } }).sort({ createdAt: -1 }).limit(100);

  const out = {
    me: { role: user.role, id: String(user._id), name: user.name },
    depts: depts.map(sDept), subjects: subjects.map(sSubject), media: media.map(sMedia), notices: notices.map(sNotice),
    faculty: facultyDocs.map((f) => sFaculty(f, user.role !== 'student')),
    students: [], att: {}, marks: {}, savedToday: {}, requests: [], admins: [], history: [], log: [], classInfo: null,
  };

  let students = [];
  if (user.role === 'admin') {
    students = await Student.find().sort({ dept: 1, sem: 1, roll: 1 });
    out.me.id = String(user._id);
  } else if (user.role === 'faculty') {
    const me = facultyDocs.find((f) => String(f._id) === String(user.profile));
    out.me.id = String(user.profile);
    const mine = subjects.filter((s) => me && me.subjects.some((id) => String(id) === String(s._id)));
    const classes = new Set(mine.map((s) => `${s.dept}-${s.sem}`));
    if (me?.classTeacherOf) classes.add(me.classTeacherOf);
    const conds = [...classes].map((k) => ({ dept: k.split('-')[0], sem: Number(k.split('-')[1]) }));
    students = conds.length ? await Student.find({ $or: conds }).sort({ dept: 1, sem: 1, roll: 1 }) : [];
  } else {
    const me = await Student.findById(user.profile);
    out.me.id = String(user.profile);
    students = me ? [me] : [];
    if (me) out.classInfo = await classInfoFor(me, subjects, facultyDocs);
  }
  out.students = students.map(sStudent);

  // attendance percentages and internal marks for the students in scope
  const ids = students.map((s) => s._id);
  if (ids.length) {
    const [summaries, marks] = await Promise.all([AttendanceSummary.find({ student: { $in: ids } }), Mark.find({ student: { $in: ids } })]);
    summaries.forEach((s) => { out.att[key(s.student, s.subject)] = pct(s); });
    marks.forEach((m) => { out.marks[key(m.student, m.subject)] = { a: m.ia1, b: m.ia2, c: m.assignment }; });
  }

  if (user.role !== 'student') {
    const sessions = await AttendanceSession.find({ date: today() }).select('subject');
    sessions.forEach((s) => { out.savedToday[String(s.subject)] = true; });
    out.history = (await YearStat.find().sort({ year: 1, dept: 1 })).map(sHistory);
  }
  if (user.role === 'admin') {
    out.requests = (await JoinRequest.find({ status: 'pending' }).sort({ createdAt: 1 })).map(sRequest);
    out.admins = (await User.find({ role: 'admin', status: 'active' }).sort({ createdAt: 1 })).map(sAdmin);
    out.log = (await ActivityLog.find().sort({ createdAt: -1 }).limit(20)).map((l) => [new Date(l.createdAt).toTimeString().slice(0, 5), l.actor, l.action]);
  }
  res.json(out);
}));

async function classInfoFor(student, subjects, facultyDocs) {
  const classmates = await Student.find({ dept: student.dept, sem: student.sem }).select('_id');
  const subs = subjects.filter((s) => s.dept === student.dept && s.sem === student.sem);
  const marks = await Mark.find({ student: { $in: classmates.map((c) => c._id) }, subject: { $in: subs.map((s) => s._id) } });
  const total = new Map();
  marks.forEach((m) => total.set(String(m.student), (total.get(String(m.student)) || 0) + m.ia1 + m.ia2 + m.assignment));
  const mine = total.get(String(student._id)) || 0;
  const ahead = [...total.values()].filter((t) => t > mine).length;
  const ct = facultyDocs.find((f) => f.classTeacherOf === `${student.dept}-${student.sem}`);
  return { key: `${student.dept}-${student.sem}`, n: classmates.length, rank: ahead + 1, ctId: ct ? String(ct._id) : null };
}

export default router;
