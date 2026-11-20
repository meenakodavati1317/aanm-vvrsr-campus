import { Router } from 'express';
import JoinRequest from '../models/JoinRequest.js';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Faculty from '../models/Faculty.js';
import { authorize } from '../middleware/auth.js';
import { ah, httpError } from '../utils/asyncHandler.js';
import { nextRoll, nextFacultyCode, nextAdminCode, logActivity } from '../utils/accounts.js';
import { admissionYearFor } from '../data/generate.js';
import { sStudent, sFaculty, sAdmin } from '../utils/serialize.js';

const router = Router();
router.use(authorize('admin'));

async function loadPending(id) {
  const request = await JoinRequest.findById(id);
  if (!request || request.status !== 'pending') throw httpError(404, 'That request is not waiting for approval.');
  const user = await User.findById(request.user);
  return { request, user };
}

// POST /api/requests/:id/approve
// Creates the student, faculty or admin profile and activates the account that signed up.
router.post('/requests/:id/approve', ah(async (req, res) => {
  const { request: r, user } = await loadPending(req.params.id);
  const result = {};
  if (r.role === 'student') {
    const roll = await nextRoll(r.dept, r.sem);
    const student = await Student.create({
      roll, name: r.name, dept: r.dept, sem: r.sem, email: r.email, phone: r.phone, dob: r.dob, guardian: r.guardian, city: r.city, admissionYear: admissionYearFor(r.sem),
    });
    if (user) { user.profile = student._id; user.loginId = roll.toLowerCase(); }
    result.student = sStudent(student);
  } else if (r.role === 'faculty') {
    const code = await nextFacultyCode();
    const faculty = await Faculty.create({
      code, name: r.name, dept: r.dept, designation: r.designation, email: r.email, phone: r.phone, experience: r.experience, qualification: r.qualification,
    });
    if (user) { user.profile = faculty._id; user.loginId = code.toLowerCase(); }
    result.faculty = sFaculty(faculty);
  } else if (user) {
    user.loginId = (await nextAdminCode()).toLowerCase();
    user.designation = r.designation;
  }
  if (user) { user.status = 'active'; await user.save(); if (r.role === 'admin') result.admin = sAdmin(user); }
  r.status = 'approved';
  await r.save();
  await logActivity(req, `Approved ${r.name} (${r.role})`);
  res.json(result);
}));

// POST /api/requests/:id/reject
router.post('/requests/:id/reject', ah(async (req, res) => {
  const { request: r, user } = await loadPending(req.params.id);
  r.status = 'rejected';
  await r.save();
  if (user) { user.status = 'rejected'; await user.save(); }
  await logActivity(req, `Rejected ${r.name} (${r.role})`);
  res.json({ ok: true });
}));

// DELETE /api/admins/:id  Removes an admin. The primary admin and your own account are protected.
router.delete('/admins/:id', ah(async (req, res) => {
  const target = await User.findOne({ _id: req.params.id, role: 'admin' });
  if (!target) throw httpError(404, 'Admin not found.');
  if (target.primary) throw httpError(400, 'The primary admin cannot be removed.');
  if (String(target._id) === String(req.user._id)) throw httpError(400, 'You cannot remove the account you are signed in with.');
  await target.deleteOne();
  await logActivity(req, `Removed admin ${target.name}`);
  res.json({ ok: true });
}));

export default router;
