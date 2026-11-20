import mongoose from 'mongoose';

// Every semester of a department is one class (40 to 60 students). The class is identified by dept + sem.
const studentSchema = new mongoose.Schema({
  roll: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  dept: { type: String, required: true, uppercase: true, index: true },
  sem: { type: Number, required: true, min: 1, max: 6 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: String,
  dob: String,
  guardian: String,
  city: String,
  bloodGroup: String,
  admissionYear: Number,
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
}, { timestamps: true });

studentSchema.index({ dept: 1, sem: 1 });

export default mongoose.model('Student', studentSchema);
