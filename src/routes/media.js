import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import Media from '../models/Media.js';
import { authorize } from '../middleware/auth.js';
import { uploadMedia, uploadDir } from '../middleware/upload.js';
import { ah, httpError } from '../utils/asyncHandler.js';
import { logActivity } from '../utils/accounts.js';
import { sMedia } from '../utils/serialize.js';

const router = Router();
router.use(authorize('admin')); // everyone sees the gallery through /api/bootstrap; only admins change it

// POST /api/media  multipart form: file, title, event, date, year
router.post('/', (req, res, next) => uploadMedia(req, res, (err) => (err ? next(err) : next())), ah(async (req, res) => {
  if (!req.file) throw httpError(400, 'Choose a photo or video to upload.');
  const b = req.body || {};
  const title = String(b.title || '').trim(), event = String(b.event || '').trim();
  if (!title || !event) {
    fs.unlink(req.file.path, () => {});
    throw httpError(400, 'Add a title and an event name.');
  }
  const media = await Media.create({
    type: req.file.mimetype.startsWith('video') ? 'video' : 'image', title, event, dateLabel: b.date || 'Today',
    year: Number(b.year) || new Date().getFullYear(), url: `/uploads/${req.file.filename}`, artHue: Math.floor(Math.random() * 100) + 230, createdBy: req.user.name,
  });
  await logActivity(req, `Uploaded ${media.type}: ${media.title}`);
  res.status(201).json({ media: sMedia(media) });
}));

// PUT /api/media/:id  { title, event, date }
router.put('/:id', ah(async (req, res) => {
  const media = await Media.findById(req.params.id);
  if (!media) throw httpError(404, 'Media item not found.');
  const b = req.body || {};
  if (b.title) media.title = b.title;
  if (b.event) media.event = b.event;
  if (b.date !== undefined) media.dateLabel = b.date;
  await media.save();
  res.json({ media: sMedia(media) });
}));

// DELETE /api/media/:id  Also deletes the uploaded file.
router.delete('/:id', ah(async (req, res) => {
  const media = await Media.findByIdAndDelete(req.params.id);
  if (!media) throw httpError(404, 'Media item not found.');
  if (media.url.startsWith('/uploads/')) fs.unlink(path.join(uploadDir, path.basename(media.url)), () => {});
  await logActivity(req, `Removed media: ${media.title}`);
  res.json({ ok: true });
}));

export default router;
