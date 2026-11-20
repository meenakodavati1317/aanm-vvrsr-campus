import mongoose from 'mongoose';

// Event photos and videos. Only admins add or remove them.
// url is "/uploads/<file>" for real uploads. Sample items have no url and show generated artwork (artKind, artHue).
const mediaSchema = new mongoose.Schema({
  type: { type: String, enum: ['image', 'video'], required: true },
  title: { type: String, required: true, trim: true },
  event: { type: String, required: true, trim: true },
  dateLabel: { type: String, default: '' },
  year: { type: Number, required: true },
  url: { type: String, default: '' },
  artKind: { type: String, default: 'stage' },
  artHue: { type: Number, default: 262 },
  order: { type: Number, default: 0 },
  createdBy: String,
}, { timestamps: true });

export default mongoose.model('Media', mediaSchema);
