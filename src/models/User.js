import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// One login account. Students and faculty point to their profile; admins keep their details here.
const userSchema = new mongoose.Schema({
  role: { type: String, enum: ['student', 'faculty', 'admin'], required: true },
  status: { type: String, enum: ['pending', 'active', 'rejected'], default: 'pending' },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  loginId: { type: String, required: true, unique: true, lowercase: true, trim: true }, // roll number, faculty code, admin code or email
  passwordHash: { type: String, required: true },
  profile: { type: mongoose.Schema.Types.ObjectId }, // Student or Faculty _id
  designation: String, // admins only
  primary: { type: Boolean, default: false }, // the first admin cannot be removed
}, { timestamps: true });

userSchema.methods.matchPassword = function matchPassword(plain) {
  return bcrypt.compare(String(plain || ''), this.passwordHash);
};

export const hashPassword = (plain) => bcrypt.hash(String(plain), 10);

export default mongoose.model('User', userSchema);
