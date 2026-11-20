import { Router } from 'express';
import Notice from '../models/Notice.js';
import { authorize } from '../middleware/auth.js';
import { ah, httpError } from '../utils/asyncHandler.js';
import { logActivity } from '../utils/accounts.js';
import { sNotice } from '../utils/serialize.js';

const router = Router();
router.use(authorize('admin')); // everyone reads notices through /api/bootstrap; only admins publish

// POST /api/notices  { title, body, audience, priority }
router.post('/', ah(async (req, res) => {
  const b = req.body || {};
  if (!String(b.title || '').trim()) throw httpError(400, 'A notice needs a title.');
  const notice = await Notice.create({
    title: b.title.trim(), body: b.body || 'No further details.', audience: ['All', 'Students', 'Faculty'].includes(b.audience) ? b.audience : 'All',
    priority: b.priority === 'High' ? 'High' : 'Normal', postedBy: 'Admin Office',
  });
  await logActivity(req, `Published notice: ${notice.title}`);
  res.status(201).json({ notice: sNotice(notice) });
}));

// DELETE /api/notices/:id
router.delete('/:id', ah(async (req, res) => {
  const notice = await Notice.findByIdAndDelete(req.params.id);
  if (!notice) throw httpError(404, 'Notice not found.');
  await logActivity(req, `Deleted notice: ${notice.title}`);
  res.json({ ok: true });
}));

export default router;
