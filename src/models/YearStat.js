import mongoose from 'mongoose';

// Past academic years, one row per year and department. The current year is calculated live from attendance and marks.
const yearStatSchema = new mongoose.Schema({
  year: { type: String, required: true }, // for example "2023-24"
  dept: { type: String, required: true, uppercase: true },
  pass: Number, // share of students with 70%+ internal marks
  att: Number, // average attendance %
  ia: Number, // average internal marks %
  cgpa: Number,
  n: Number, // strength
  placed: Number, // placement %
  toppers: [{ name: String, cgpa: Number, _id: false }],
}, { timestamps: true });

yearStatSchema.index({ year: 1, dept: 1 }, { unique: true });

export default mongoose.model('YearStat', yearStatSchema);
