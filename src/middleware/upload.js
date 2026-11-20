import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import multer from 'multer';

const uploadDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, crypto.randomBytes(12).toString('hex') + path.extname(file.originalname).toLowerCase()),
});

// Photos and videos only. The size limit comes from MAX_UPLOAD_MB.
export const uploadMedia = multer({
  storage,
  limits: { fileSize: (Number(process.env.MAX_UPLOAD_MB) || 100) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^(image|video)\//.test(file.mimetype)) return cb(null, true);
    const err = new Error('Only photos and videos can be uploaded.');
    err.status = 400;
    cb(err);
  },
}).single('file');

export { uploadDir };
