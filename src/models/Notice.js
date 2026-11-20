import mongoose from 'mongoose';

const noticeSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  body: { type: String, default: '' },
  audience: { type: String, enum: ['All', 'Students', 'Faculty'], default: 'All' },
  priority: { type: String, enum: ['Normal', 'High'], default: 'Normal' },
  postedBy: { type: String, default: 'Admin Office' },
}, { timestamps: true });

export default mongoose.model('Notice', noticeSchema);
