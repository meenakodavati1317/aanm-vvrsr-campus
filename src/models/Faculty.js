import mongoose from 'mongoose';

const facultySchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  dept: { type: String, required: true, uppercase: true, index: true },
  designation: { type: String, default: 'Assistant Professor' },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: String,
  experience: { type: Number, default: 0, min: 0 },
  qualification: String,
  subjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }], // subjects this teacher takes
  classTeacherOf: { type: String, default: '' }, // for example "CSE-6": the one main faculty of that class
}, { timestamps: true });

export default mongoose.model('Faculty', facultySchema);
