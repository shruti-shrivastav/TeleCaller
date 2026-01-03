import { Router } from 'express';
import { auth } from '../middleware/auth';
import {
  listEnquiries,
  updateEnquiry,
} from '../controllers/website.enquiry.controller';

const r = Router();

r.get('/v1/admin/web-enquiries', auth(['admin', 'leader']), listEnquiries);
r.patch(
  '/v1/admin/web-enquiries/:id',
  auth(['admin', 'leader']),
  updateEnquiry
);

export default r;
