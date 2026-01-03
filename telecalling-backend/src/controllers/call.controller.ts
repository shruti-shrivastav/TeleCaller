import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { CallLog, CallResult } from '../models/Call';
import { Lead } from '../models/Lead';
import { Goal } from '../models/Goal';
import { ActivityLog } from '../models/ActivityLog';

/**
 * GET /calls
 * Query:
 *  - page, pageSize
 *  - leadId
 *  - telecallerId (admins/leaders only; telecallers are auto-scoped)
 *  - start, end (ISO dates; filters by createdAt)
 *  - result (status)
 *  - q (search: lead.name / lead.phone / remarks / result)
 */
export const listCallLogs = async (req: AuthRequest, res: Response) => {
  const page = Math.max(parseInt(String(req.query.page || '1'), 10), 1);
  const pageSize = Math.max(parseInt(String(req.query.pageSize || '20'), 10), 1);
  const limit = Math.min(pageSize, 100);
  const skip = (page - 1) * limit;

  const filter: any = {};

  // Scope by role: telecaller sees only their own
  if (req.user!.role === 'telecaller') {
    filter.telecallerId = req.user!.id;
  }

  // Optional admin/leader filter by telecallerId
  if (req.query.telecallerId && req.user!.role !== 'telecaller') {
    filter.telecallerId = req.query.telecallerId;
  }

  // Optional filter by lead
  if (req.query.leadId) {
    filter.leadId = req.query.leadId;
  }

  // Optional result filter
  if (req.query.result) {
    filter.result = req.query.result;
  }

  // Optional date range (inclusive)
  const createdAt: any = {};
  if (req.query.start) createdAt.$gte = new Date(String(req.query.start));
  if (req.query.end) {
    const end = new Date(String(req.query.end));
    end.setHours(23, 59, 59, 999);
    createdAt.$lte = end;
  }
  if (Object.keys(createdAt).length) filter.createdAt = createdAt;

  // Search:
  // - remarks/result regex
  // - OR Lead name/phone match (via prefetch leadIds)
  const q = String(req.query.q || '').trim();
  if (q) {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const leadMatches = await Lead.find({
      $or: [{ name: regex }, { phone: regex }],
    }).select('_id');

    const or: any[] = [{ remarks: regex }, { result: regex }];
    if (leadMatches.length) {
      or.push({ leadId: { $in: leadMatches.map((l) => l._id) } });
    }
    filter.$or = or;
  }

  const [items, total] = await Promise.all([
    CallLog.find(filter)
      .populate('leadId', 'name phone status behaviour')
      .populate('telecallerId', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    CallLog.countDocuments(filter),
  ]);

  res.json({
    items,
    total,
    page,
    pageSize: limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
};

/**
 * POST /calls
 * Body: { leadId, result, remarks?, duration? }
 * (unchanged; returns { success, message, call })
 */
export const createCallLog = async (req: AuthRequest, res: Response) => {
  const { leadId, result, remarks } = req.body as {
    leadId: string;
    result: CallResult;
    remarks?: string;
  };

  if (!leadId || !result) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // 1) Validate lead + permissions
  const lead = await Lead.findById(leadId);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  if (req.user!.role === 'telecaller' && String(lead.assignedTo) !== req.user!.id) {
    return res.status(403).json({ error: 'You can log calls only for your assigned leads' });
  }

  // 2) Create call log
  const call = await CallLog.create({
    leadId,
    telecallerId: req.user!.id,
    result,
    remarks,
  });

  // 3) Atomically bump callCount + set lastCallAt (+ optional status flip)
  const leadUpdate: any = {
    $inc: { callCount: 1 },
    $set: { lastCallAt: new Date() },
  };
  if (lead.status === 'new') {
    leadUpdate.$set.status = 'in_progress';
  }
  await Lead.findByIdAndUpdate(leadId, leadUpdate);

  // 4) Weekly goal + Activity log (unchanged)
  await Goal.findOneAndUpdate(
    {
      userId: req.user!.id,
      type: 'weekly_calls',
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    },
    { $inc: { achieved: 1 } },
    { upsert: false }
  );

  await ActivityLog.create({
    userId: req.user!.id,
    action: 'CREATE_CALL_LOG',
    targetId: leadId,
    meta: { result, remarks },
  });

  return res.status(201).json({
    success: true,
    message: 'Call logged successfully',
    call,
  });
};