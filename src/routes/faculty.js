import { Router } from 'express';
import Faculty from '../models/Faculty.js';
import Subject from '../models/Subject.js';
import Department from '../models/Department.js';
import User from '../models/User.js';
import { authorize } from '../middleware/auth.js';
import { ah, httpError } from '../utils/asyncHandler.js';
import { createFaculty, logActivity, defaultPassword } from '../utils/accounts.js';
import { sFaculty } from '../utils/serialize.js';

const router = Router();
router.use(authorize('admin'));

async function cleanSubjects(ids) {
  const list = Array.isArray(ids) ? ids : [];
  const found = await Subject.find({ _id: { $in: list } }).select('_id');
  return found.map((s) => s._id);
}

// POST /api/faculty  { name, dept, desig, email, phone, exp, subs: [subjectId] }
router.post('/', ah(async (req, res) => {
  const b = req.body || {};
  if (!String(b.name || '').trim()) throw httpError(400, 'Faculty name is required.');
  const dept = String(b.dept || '').toUpperCase();
  if (!(await Department.exists({ code: dept }))) throw httpError(400, 'Choose a valid department.');
  const email = (b.email || b.name.toLowerCase().replace(/[^a-z ]/g, '').trim().replace(/ +/g, '.') + '@aanmvvrsr.edu').toLowerCase();
  const { faculty } = await createFaculty({
    name: b.name.trim(), dept, designation: b.desig || 'Assistant Professor', email, phone: b.phone, experience: Number(b.exp) || 0, subjects: await cleanSubjects(b.subs),
  });
  await logActivity(req, `Added faculty ${faculty.name}`);
  res.status(201).json({ faculty: sFaculty(faculty), defaultPassword: defaultPassword() });
}));

// PUT /api/faculty/:id
router.put('/:id', ah(async (req, res) => {
  const f = await Faculty.findById(req.params.id);
  if (!f) throw httpError(404, 'Faculty member not found.');
  const b = req.body || {};
  if (b.name !== undefined) f.name = b.name;
  if (b.dept !== undefined) f.dept = String(b.dept).toUpperCase();
  if (b.desig !== undefined) f.designation = b.desig;
  if (b.email !== undefined) f.email = b.email;
  if (b.phone !== undefined) f.phone = b.phone;
  if (b.exp !== undefined) f.experience = Number(b.exp) || 0;
  if (b.subs !== undefined) f.subjects = await cleanSubjects(b.subs);
  await f.save();
  await User.updateOne({ profile: f._id, role: 'faculty' }, { name: f.name, email: f.email });
  await logActivity(req, `Updated faculty ${f.name}`);
  res.json({ faculty: sFaculty(f) });
}));

// DELETE /api/faculty/:id
router.delete('/:id', ah(async (req, res) => {
  const f = await Faculty.findByIdAndDelete(req.params.id);
  if (!f) throw httpError(404, 'Faculty member not found.');
  await User.deleteOne({ profile: f._id, role: 'faculty' });
  await logActivity(req, `Removed faculty ${f.name}`);
  res.json({ ok: true });
}));

export default router;
