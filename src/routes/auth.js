import { Router } from 'express';
import User, { hashPassword } from '../models/User.js';
import JoinRequest from '../models/JoinRequest.js';
import Department from '../models/Department.js';
import { signToken } from '../middleware/auth.js';
import { ah, httpError } from '../utils/asyncHandler.js';
import { sDept } from '../utils/serialize.js';

const router = Router();
const ROLES = ['student', 'faculty', 'admin'];

// GET /api/auth/departments  (public) so the sign-up form can list departments before anyone is signed in
router.get('/departments', ah(async (req, res) => {
  res.json({ depts: (await Department.find().sort('code')).map(sDept) });
}));

// POST /api/auth/register  (public)
// New students, faculty and admins ask to join. An admin must approve the request before they can sign in.
router.post('/register', ah(async (req, res) => {
  const b = req.body || {};
  const role = String(b.role || '').toLowerCase();
  if (!ROLES.includes(role)) throw httpError(400, 'Choose student, faculty or admin.');
  const name = String(b.name || '').trim();
  const email = String(b.email || '').trim().toLowerCase();
  const password = String(b.password || '');
  if (!name) throw httpError(400, 'Please enter your full name.');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw httpError(400, 'Please enter a valid email address.');
  if (password.length < 6) throw httpError(400, 'The password needs at least 6 characters.');
  if (await User.exists({ $or: [{ email }, { loginId: email }] })) throw httpError(409, 'An account with this email already exists. Sign in instead.');

  const request = { role, name, email, phone: b.phone };
  if (role === 'student' || role === 'faculty') {
    const dept = String(b.dept || '').toUpperCase();
    if (!(await Department.exists({ code: dept }))) throw httpError(400, 'Choose a valid department.');
    request.dept = dept;
  }
  if (role === 'student') {
    const sem = Number(b.sem);
    if (!(sem >= 1 && sem <= 6)) throw httpError(400, 'Choose a semester from 1 to 6.');
    Object.assign(request, { sem, dob: b.dob, guardian: b.guardian, city: b.city, details: `B.Tech ${request.dept}, Semester ${sem}` });
  }
  if (role === 'faculty') {
    Object.assign(request, { designation: b.designation || 'Assistant Professor', experience: Number(b.experience) || 0, qualification: b.qualification });
    request.details = `${request.designation}, ${request.dept}, ${request.experience} yrs${b.qualification ? ', ' + b.qualification : ''}`;
  }
  if (role === 'admin') {
    const code = String(b.inviteCode || '').trim();
    const note = code ? (code === (process.env.ADMIN_INVITE_CODE || 'AV-2026') ? 'Valid invite code' : 'Invite code not recognised') : 'No invite code';
    Object.assign(request, { designation: b.designation || 'Administrator', employeeId: b.employeeId, inviteCode: code });
    request.details = `${request.designation}, employee ID ${b.employeeId || 'not given'}. ${note}`;
  }

  const user = await User.create({
    role, status: 'pending', name, email, loginId: email, passwordHash: await hashPassword(password), designation: request.designation,
  });
  await JoinRequest.create({ ...request, user: user._id });
  res.status(201).json({ message: 'Request sent. An admin will review it.' });
}));

// POST /api/auth/login  (public)  { role, loginId, password }
router.post('/login', ah(async (req, res) => {
  const role = String(req.body?.role || '').toLowerCase();
  const id = String(req.body?.loginId || '').trim().toLowerCase();
  if (!ROLES.includes(role) || !id) throw httpError(400, 'Enter your ID or email and your password.');
  const user = await User.findOne({ role, $or: [{ loginId: id }, { email: id }] });
  if (!user || !(await user.matchPassword(req.body?.password))) throw httpError(401, 'Wrong ID, email or password.');
  if (user.status === 'pending') return res.status(403).json({ code: 'PENDING', message: 'Your account is waiting for admin approval. You can sign in once it is approved.' });
  if (user.status === 'rejected') return res.status(403).json({ code: 'REJECTED', message: 'This request was rejected. Please contact the admin office.' });
  res.json({ token: signToken(user), role: user.role });
}));

export default router;
