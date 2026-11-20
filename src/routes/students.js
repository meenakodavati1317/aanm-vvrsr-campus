import { Router } from 'express';
import Student from '../models/Student.js';
import User from '../models/User.js';
import Department from '../models/Department.js';
import AttendanceSummary from '../models/AttendanceSummary.js';
import Mark from '../models/Mark.js';
import { authorize } from '../middleware/auth.js';
import { ah, httpError } from '../utils/asyncHandler.js';
import { createStudent, logActivity, defaultPassword } from '../utils/accounts.js';
import { admissionYearFor } from '../data/generate.js';
import { sStudent } from '../utils/serialize.js';

const router = Router();
router.use(authorize('admin'));

const FIELDS = ['name', 'dept', 'sem', 'email', 'phone', 'dob', 'guardian', 'city', 'status'];

async function checkClass(dept, sem) {
  if (!(await Department.exists({ code: String(dept).toUpperCase() }))) throw httpError(400, 'Choose a valid department.');
  if (!(Number(sem) >= 1 && Number(sem) <= 6)) throw httpError(400, 'Semester must be from 1 to 6.');
}

// POST /api/students  Adds a student with a login (roll number + default password).
router.post('/', ah(async (req, res) => {
  const b = req.body || {};
  if (!String(b.name || '').trim()) throw httpError(400, 'Student name is required.');
  await checkClass(b.dept, b.sem);
  const sem = Number(b.sem);
  const { student } = await createStudent({
    name: b.name.trim(), dept: String(b.dept).toUpperCase(), sem, email: b.email || undefined, phone: b.phone, dob: b.dob, guardian: b.guardian,
    city: b.city, status: b.status === 'Inactive' ? 'Inactive' : 'Active', admissionYear: admissionYearFor(sem),
  });
  await logActivity(req, `Added student ${student.name}`);
  res.status(201).json({ student: sStudent(student), defaultPassword: defaultPassword() });
}));

// PUT /api/students/:id
router.put('/:id', ah(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw httpError(404, 'Student not found.');
  const b = req.body || {};
  if (b.dept !== undefined || b.sem !== undefined) await checkClass(b.dept ?? student.dept, b.sem ?? student.sem);
  for (const f of FIELDS) if (b[f] !== undefined) student[f] = f === 'sem' ? Number(b[f]) : f === 'dept' ? String(b[f]).toUpperCase() : b[f];
  await student.save();
  await User.updateOne({ profile: student._id, role: 'student' }, { name: student.name, email: student.email });
  await logActivity(req, `Updated student ${student.name}`);
  res.json({ student: sStudent(student) });
}));

// DELETE /api/students/:id  Removes the student, their login, attendance and marks.
router.delete('/:id', ah(async (req, res) => {
  const student = await Student.findByIdAndDelete(req.params.id);
  if (!student) throw httpError(404, 'Student not found.');
  await Promise.all([
    User.deleteOne({ profile: student._id, role: 'student' }),
    AttendanceSummary.deleteMany({ student: student._id }),
    Mark.deleteMany({ student: student._id }),
  ]);
  await logActivity(req, `Deleted student ${student.name}`);
  res.json({ ok: true });
}));

export default router;
