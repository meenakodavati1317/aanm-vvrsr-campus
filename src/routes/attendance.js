import { Router } from 'express';
import Subject from '../models/Subject.js';
import Student from '../models/Student.js';
import Faculty from '../models/Faculty.js';
import AttendanceSummary from '../models/AttendanceSummary.js';
import AttendanceSession from '../models/AttendanceSession.js';
import { authorize } from '../middleware/auth.js';
import { ah, httpError } from '../utils/asyncHandler.js';
import { logActivity, today } from '../utils/accounts.js';
import { pct, key } from '../utils/serialize.js';

const router = Router();

// Faculty may only work on their own subjects. Admins may work on any subject.
export async function loadSubjectFor(req, subjectId) {
  const subject = await Subject.findById(subjectId);
  if (!subject) throw httpError(404, 'Subject not found.');
  if (req.user.role === 'faculty') {
    const me = await Faculty.findById(req.user.profile);
    if (!me || !me.subjects.some((id) => String(id) === String(subject._id))) throw httpError(403, 'That subject is not assigned to you.');
  }
  return subject;
}

// POST /api/attendance/session  { subjectId, records: [{ studentId, present }] }
// Marks today's class once per subject and updates every student's running percentage.
router.post('/session', authorize('faculty', 'admin'), ah(async (req, res) => {
  const subject = await loadSubjectFor(req, req.body?.subjectId);
  const date = today();
  if (await AttendanceSession.exists({ subject: subject._id, date })) throw httpError(409, 'Attendance for this subject is already saved today.');

  const classIds = new Set((await Student.find({ dept: subject.dept, sem: subject.sem }).select('_id')).map((s) => String(s._id)));
  const records = (Array.isArray(req.body.records) ? req.body.records : [])
    .filter((r) => classIds.has(String(r.studentId)))
    .map((r) => ({ student: r.studentId, present: !!r.present }));
  if (!records.length) throw httpError(400, 'There are no students to mark.');

  await AttendanceSession.create({ subject: subject._id, date, takenBy: req.user.name, records });
  await AttendanceSummary.bulkWrite(records.map((r) => ({
    updateOne: { filter: { student: r.student, subject: subject._id }, update: { $inc: { held: 1, attended: r.present ? 1 : 0 } }, upsert: true },
  })));

  const summaries = await AttendanceSummary.find({ subject: subject._id, student: { $in: records.map((r) => r.student) } });
  const updates = {};
  summaries.forEach((s) => { updates[key(s.student, s.subject)] = pct(s); });
  await logActivity(req, `Marked attendance: ${subject.name}`);
  res.json({ updates });
}));

// PUT /api/attendance/correct  { studentId, subjectId, percent }   (admin) fixes a student's percentage
router.put('/correct', authorize('admin'), ah(async (req, res) => {
  const percent = Math.max(0, Math.min(100, Number(req.body?.percent) || 0));
  const subject = await Subject.findById(req.body?.subjectId);
  const student = await Student.findById(req.body?.studentId);
  if (!subject || !student) throw httpError(404, 'Student or subject not found.');
  const existing = await AttendanceSummary.findOne({ student: student._id, subject: subject._id });
  const held = existing?.held || 40;
  const attended = Math.round((held * percent) / 100);
  await AttendanceSummary.updateOne({ student: student._id, subject: subject._id }, { held, attended }, { upsert: true });
  await logActivity(req, `Corrected attendance in ${subject.name}`);
  res.json({ percent: Math.round((attended / held) * 100) });
}));

export default router;
