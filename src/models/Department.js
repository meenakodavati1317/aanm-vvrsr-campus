import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  hod: { type: String, default: 'To be assigned' },
}, { timestamps: true });

export default mongoose.model('Department', departmentSchema);
