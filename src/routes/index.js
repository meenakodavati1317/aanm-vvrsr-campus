import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import auth from './auth.js';
import bootstrap from './bootstrap.js';
import students from './students.js';
import faculty from './faculty.js';
import academics from './academics.js';
import attendance from './attendance.js';
import marks from './marks.js';
import notices from './notices.js';
import media from './media.js';
import requests from './requests.js';

const router = Router();

router.get('/health', (req, res) => res.json({ ok: true }));
router.use('/auth', auth); // sign up and sign in are public

router.use(protect); // everything below needs a signed-in, approved account
router.use('/bootstrap', bootstrap);
router.use('/students', students);
router.use('/faculty', faculty);
router.use('/', academics); // /departments, /subjects, /classes
router.use('/attendance', attendance);
router.use('/marks', marks);
router.use('/notices', notices);
router.use('/media', media);
router.use('/', requests); // /requests and /admins

export default router;
