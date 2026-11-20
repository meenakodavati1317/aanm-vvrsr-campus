import mongoose from 'mongoose';

// Running totals per student and subject. Percentage = attended / held.
const summarySchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  held: { type: Number, default: 0, min: 0 },
  attended: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

summarySchema.index({ student: 1, subject: 1 }, { unique: true });
summarySchema.index({ subject: 1 });

export default mongoose.model('AttendanceSummary', summarySchema);
