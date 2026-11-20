import { Router } from 'express';
import Department from '../models/Department.js';
import Subject from '../models/Subject.js';
import Student from '../models/Student.js';
import Faculty from '../models/Faculty.js';
import Mark from '../models/Mark.js';
import AttendanceSummary from '../models/AttendanceSummary.js';
import { authorize } from '../middleware/auth.js';
import { ah, httpError } from '../utils/asyncHandler.js';
import { logActivity } from '../utils/accounts.js';
import { sDept, sSubject } from '../utils/serialize.js';

const router = Router();
const admin = authorize('admin');

// POST /api/departments  { code, name, hod }
router.post('/departments', admin, ah(async (req, res) => {
  const b = req.body || {};
  const code = String(b.code || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{2,8}$/.test(code)) throw httpError(400, 'Use a short code of letters and numbers, for example EEE.');
  if (!String(b.name || '').trim()) throw httpError(400, 'Department name is required.');
  if (await Department.exists({ code })) throw httpError(409, 'That department code already exists.');
  const dept = await Department.create({ code, name: b.name.trim(), hod: b.hod || 'To be assigned' });
  await logActivity(req, `Added department ${code}`);
  res.status(201).json({ dept: sDept(dept) });
}));

// DELETE /api/departments/:code  Only when it has no students or faculty.
router.delete('/departments/:code', admin, ah(async (req, res) => {
  const code = String(req.params.code).toUpperCase();
  if (await Student.exists({ dept: code }) || await Faculty.exists({ dept: code })) throw httpError(409, 'Move or remove its students and faculty first.');
  const subs = await Subject.find({ dept: code }).select('_id');
  await Promise.all([Subject.deleteMany({ dept: code }), Mark.deleteMany({ subject: { $in: subs } }), AttendanceSummary.deleteMany({ subject: { $in: subs } }), Department.deleteOne({ code })]);
  await logActivity(req, `Deleted department ${code}`);
  res.json({ ok: true });
}));

// POST /api/subjects  { dept, sem, name, credits }
router.post('/subjects', admin, ah(async (req, res) => {
  const b = req.body || {};
  const dept = String(b.dept || '').toUpperCase(), sem = Number(b.sem);
  if (!(await Department.exists({ code: dept }))) throw httpError(400, 'Choose a valid department.');
  if (!(sem >= 1 && sem <= 6)) throw httpError(400, 'Semester must be from 1 to 6.');
  if (!String(b.name || '').trim()) throw httpError(400, 'Subject name is required.');
  let n = (await Subject.countDocuments({ dept, sem })) + 1;
  while (await Subject.exists({ dept, sem, code: `${dept}${sem}0${n}` })) n++;
  const subject = await Subject.create({ dept, sem, name: b.name.trim(), code: `${dept}${sem}0${n}`, credits: Number(b.credits) || 3 });
  await logActivity(req, `Added subject ${subject.name}`);
  res.status(201).json({ subject: sSubject(subject) });
}));

// DELETE /api/subjects/:id  Also removes it from teachers and deletes its marks and attendance.
router.delete('/subjects/:id', admin, ah(async (req, res) => {
  const subject = await Subject.findByIdAndDelete(req.params.id);
  if (!subject) throw httpError(404, 'Subject not found.');
  await Promise.all([
    Faculty.updateMany({}, { $pull: { subjects: subject._id } }),
    Mark.deleteMany({ subject: subject._id }),
    AttendanceSummary.deleteMany({ subject: subject._id }),
  ]);
  await logActivity(req, `Removed subject ${subject.name}`);
  res.json({ ok: true });
}));

// PUT /api/classes/:key/teacher  { facultyId }   key looks like CSE-6
// A class has one class teacher, and a teacher is class teacher of one class.
router.put('/classes/:key/teacher', admin, ah(async (req, res) => {
  const key = String(req.params.key).toUpperCase();
  if (!/^[A-Z0-9]+-[1-6]$/.test(key)) throw httpError(400, 'Class should look like CSE-6.');
  const dept = key.split('-')[0];
  const f = await Faculty.findById(req.body?.facultyId);
  if (!f) throw httpError(404, 'Faculty member not found.');
  if (f.dept !== dept) throw httpError(400, `Choose a ${dept} faculty member for this class.`);
  const changed = [];
  const previous = await Faculty.find({ classTeacherOf: key, _id: { $ne: f._id } });
  for (const p of previous) { p.classTeacherOf = ''; await p.save(); changed.push({ id: String(p._id), ct: '' }); }
  f.classTeacherOf = key;
  await f.save();
  changed.push({ id: String(f._id), ct: key });
  await logActivity(req, `Assigned ${f.name} as class teacher of ${key}`);
  res.json({ faculty: changed });
}));

export default router;
