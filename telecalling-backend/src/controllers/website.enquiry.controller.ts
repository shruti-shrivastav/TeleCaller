import { Request, Response } from 'express';
import { WebsiteEnquiryModel } from '../models/WebsiteEnquiry';

export async function createPublicEnquiry(req: Request, res: Response) {
  const body = req.body || {};

  if (body.company) return res.status(200).json({ ok: true });

  const name = String(body.name || '').trim();
  const email = body.email ? String(body.email).trim() : undefined;
  const phone = body.phone ? String(body.phone).trim() : undefined;

  if (!name || !email || !phone) {
    return res
      .status(400)
      .json({ message: 'name and (email or phone) is required' });
  }

  const doc = await WebsiteEnquiryModel.create({
    name,
    email,
    phone,
    status: 'new',
  });
  res.status(201).json({ id: doc._id, ok: true });
}

export async function listEnquiries(req: Request, res: Response) {
  const {
    q = '',
    status,
    from,
    to,
    page = '1',
    pageSize = '20',
    sort = '-createdAt',
  } = req.query as Record<string, string>;

  const pg = Math.max(1, parseInt(page, 10) || 1);
  const size = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));

  const filter: any = {};
  if (status) filter.status = status;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to + 'T23:59:59.999Z');
  }
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
      { phone: { $regex: q, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    WebsiteEnquiryModel.find(filter)
      .sort(sort)
      .skip((pg - 1) * size)
      .limit(size)
      .lean(),
    WebsiteEnquiryModel.countDocuments(filter),
  ]);

  res.json({
    items,
    total,
    page: pg,
    pageSize,
    totalPages: Math.ceil(total / size) || 1,
  });
}

export async function updateEnquiry(req: Request, res: Response) {
  const { id } = req.params;
  const { status } = req.body || {};
  if (!['new', 'done'].includes(status)) {
    return res.status(400).json({ message: 'status must be "new" or "done"' });
  }

  const updated = await WebsiteEnquiryModel.findByIdAndUpdate(
    id,
    { $set: { status } },
    { new: true, runValidators: true }
  ).lean();

  if (!updated) return res.status(404).json({ message: 'Not found' });
  res.json(updated);
}
