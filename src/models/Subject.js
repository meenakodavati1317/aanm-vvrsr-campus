import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema({
  dept: { type: String, required: true, uppercase: true, index: true },
  sem: { type: Number, required: true, min: 1, max: 6 },
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true },
  credits: { type: Number, default: 3, min: 1, max: 10 },
}, { timestamps: true });

subjectSchema.index({ dept: 1, sem: 1, code: 1 }, { unique: true });

export default mongoose.model('Subject', subjectSchema);
