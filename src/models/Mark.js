import mongoose from 'mongoose';

// Internal marks: IA-1 and IA-2 out of 20, assignment out of 10 (total 50).
const markSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  ia1: { type: Number, default: 0, min: 0, max: 20 },
  ia2: { type: Number, default: 0, min: 0, max: 20 },
  assignment: { type: Number, default: 0, min: 0, max: 10 },
}, { timestamps: true });

markSchema.index({ student: 1, subject: 1 }, { unique: true });
markSchema.index({ subject: 1 });

export default mongoose.model('Mark', markSchema);
