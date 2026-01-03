import { Router } from 'express';
import {
  createLead,
  deleteLead,
  getLead,
  listLeads,
  updateLead,
  bulkUpdateLeads,
  bulkAssignLeads,
  updateLeadStatus,
  uploadLeadsUniversal,
  exportLeads, // 👈 add this import
} from '../controllers/lead.controller';
import { auth } from '../middleware/auth';
import { upload } from '../config/multer';

const r = Router();

r.post(
  '/upload-csv',
  auth(['admin']),
  upload.single('file'),
  uploadLeadsUniversal
);
r.get('/export', auth(['admin', 'leader']), exportLeads);
r.put('/bulk/assign', auth(['admin', 'leader']), bulkAssignLeads);
r.put('/bulk', auth(['admin', 'leader']), bulkUpdateLeads); // 👈 new bulk endpoint
r.patch(
  '/:id/status',
  auth(['admin', 'leader', 'telecaller']),
  updateLeadStatus
);
r.post('/', auth(['admin']), createLead);
r.get('/', auth(['admin', 'leader', 'telecaller']), listLeads);
r.put('/:id', auth(['admin', 'leader', 'telecaller']), updateLead);
r.get('/:id', auth(['admin', 'leader', 'telecaller']), getLead);
r.delete('/:id', auth(['admin', 'leader', 'telecaller']), deleteLead);

export default r;
