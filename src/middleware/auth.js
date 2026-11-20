import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const signToken = (user) => jwt.sign({ uid: String(user._id), role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

// Requires a valid "Authorization: Bearer <token>" header and an active account.
export async function protect(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Please sign in.' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.uid);
    if (!user || user.status !== 'active') return res.status(401).json({ message: 'Your session is no longer valid. Please sign in again.' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Your session expired. Please sign in again.' });
  }
}

// Allows only the listed roles, for example authorize('admin') or authorize('admin', 'faculty').
export const authorize = (...roles) => (req, res, next) => (
  roles.includes(req.user.role) ? next() : res.status(403).json({ message: 'You do not have permission to do that.' })
);
