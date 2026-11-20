import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { connectDB } from './src/config/db.js';
import routes from './src/routes/index.js';
import { notFound, errorHandler } from './src/middleware/errors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing. Copy .env.example to .env and set it.');
  process.exit(1);
}

fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true }));
app.use(express.json({ limit: '1mb' }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api', routes);
app.use('/api', notFound);
app.use(express.static(path.join(__dirname, 'public')));
app.use(errorHandler);

const port = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(port, () => console.log(`AANM&VVRSR Campus is running at http://localhost:${port}`));
  })
  .catch((err) => {
    console.error('Could not connect to MongoDB:', err.message);
    process.exit(1);
  });
