import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  actor: { type: String, required: true },
  action: { type: String, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

export default mongoose.model('ActivityLog', activitySchema);
