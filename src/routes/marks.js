import { Router } from 'express';
import Student from '../models/Student.js';
import Mark from '../models/Mark.js';
import { authorize } from '../middleware/auth.js';
import { ah, httpError } from '../utils/asyncHandler.js';
import { logActivity } from '../utils/accounts.js';
import { loadSubjectFor } from './attendance.js';

const router = Router();
const clamp = (v, max) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));

// PUT /api/marks/bulk  { subjectId, rows: [{ studentId, a, b, c }] }
// a = IA-1 (20), b = IA-2 (20), c = assignment (10).
router.put('/bulk', authorize('faculty', 'admin'), ah(async (req, res) => {
  const subject = await loadSubjectFor(req, req.body?.subjectId);
  const classIds = new Set((await Student.find({ dept: subject.dept, sem: subject.sem }).select('_id')).map((s) => String(s._id)));
  const rows = (Array.isArray(req.body.rows) ? req.body.rows : []).filter((r) => classIds.has(String(r.studentId)));
  if (!rows.length) throw httpError(400, 'There are no marks to save.');
  await Mark.bulkWrite(rows.map((r) => ({
    updateOne: {
      filter: { student: r.studentId, subject: subject._id },
      update: { $set: { ia1: clamp(r.a, 20), ia2: clamp(r.b, 20), assignment: clamp(r.c, 10) } },
      upsert: true,
    },
  })));
  await logActivity(req, `Updated internal marks: ${subject.name}`);
  res.json({ ok: true, saved: rows.length });
}));

export default router;
