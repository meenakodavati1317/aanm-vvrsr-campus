import mongoose from 'mongoose';

// A sign-up waiting for an admin. Approving it creates the student, faculty or admin profile.
const joinRequestSchema = new mongoose.Schema({
  role: { type: String, enum: ['student', 'faculty', 'admin'], required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true },
  phone: String,
  dept: String,
  sem: Number,
  dob: String,
  guardian: String,
  city: String,
  designation: String,
  experience: Number,
  qualification: String,
  employeeId: String,
  inviteCode: String,
  details: String,
}, { timestamps: true });

export default mongoose.model('JoinRequest', joinRequestSchema);
