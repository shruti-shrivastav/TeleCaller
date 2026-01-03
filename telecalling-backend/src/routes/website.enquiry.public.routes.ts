import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { createPublicEnquiry } from '../controllers/website.enquiry.controller';
import { verifySiteToken } from '../middleware/site-token';

const r = Router();

const allowed = (process.env.WEBSITE_FORM_CORS || '')
  .split(',').map(s => s.trim()).filter(Boolean);

r.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (allowed.length === 0 || allowed.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  methods: ['POST', 'OPTIONS'],
}));

const limiter = rateLimit({
  windowMs: Number(process.env.ENQUIRY_RATE_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.ENQUIRY_RATE_MAX || 100),
  standardHeaders: true,
  legacyHeaders: false,
});

// Only name, phone, email accepted
r.post('/v1/public/web-enquiries', limiter, verifySiteToken, createPublicEnquiry);

export default r;