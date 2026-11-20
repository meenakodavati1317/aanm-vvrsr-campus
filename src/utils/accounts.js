import Student from '../models/Student.js';
import Faculty from '../models/Faculty.js';
import User, { hashPassword } from '../models/User.js';
import ActivityLog from '../models/ActivityLog.js';
import { rollFor } from '../data/generate.js';

export const defaultPassword = () => process.env.DEFAULT_PASSWORD || 'demo1234';

// Next free roll number in a class, for example AV23CSE018.
export async function nextRoll(dept, sem) {
  const prefix = rollFor(dept, sem, 0).slice(0, -3);
  const last = await Student.findOne({ roll: new RegExp('^' + prefix + '\\d{3}$') }).sort({ roll: -1 }).select('roll');
  return rollFor(dept, sem, last ? parseInt(last.roll.slice(-3), 10) + 1 : 1);
}

async function nextCode(Model, field, prefix, width) {
  const rows = await Model.find({ [field]: new RegExp('^' + prefix + '-\\d+$', 'i') }).select(field);
  const max = rows.reduce((m, r) => Math.max(m, parseInt(String(r[field]).split('-')[1], 10) || 0), 0);
  return `${prefix}-${String(max + 1).padStart(width, '0')}`;
}
export const nextFacultyCode = () => nextCode(Faculty, 'code', 'FAC', 4);
export const nextAdminCode = () => nextCode(User, 'loginId', 'ADM', 4);

// Creates a student profile together with an active login account.
export async function createStudent(data, passwordHash) {
  const roll = data.roll || await nextRoll(data.dept, data.sem);
  const student = await Student.create({ ...data, roll, email: (data.email || `${roll}@aanmvvrsr.edu`).toLowerCase() });
  const user = await User.create({
    role: 'student', status: 'active', name: student.name, email: student.email, loginId: roll.toLowerCase(),
    passwordHash: passwordHash || await hashPassword(defaultPassword()), profile: student._id,
  });
  return { student, user };
}

export async function createFaculty(data, passwordHash) {
  const code = data.code || await nextFacultyCode();
  const faculty = await Faculty.create({ ...data, code });
  const user = await User.create({
    role: 'faculty', status: 'active', name: faculty.name, email: faculty.email, loginId: code.toLowerCase(),
    passwordHash: passwordHash || await hashPassword(defaultPassword()), profile: faculty._id,
  });
  return { faculty, user };
}

export const logActivity = (req, action) => ActivityLog.create({ actor: req.user.name, action }).catch(() => {});

export const today = () => new Date().toISOString().slice(0, 10);
