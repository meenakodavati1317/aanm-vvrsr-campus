import mongoose from 'mongoose';

// One class period that a teacher marked. A subject can be marked once per day.
const sessionSchema = new mongoose.Schema({
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  takenBy: { type: String },
  records: [{ student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' }, present: Boolean, _id: false }],
}, { timestamps: true });

sessionSchema.index({ subject: 1, date: 1 }, { unique: true });

export default mongoose.model('AttendanceSession', sessionSchema);
