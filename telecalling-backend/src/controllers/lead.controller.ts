import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Lead, PROJECT_OPTIONS } from '../models/Lead';
import type { ILead } from '../models/Lead';
import { User } from '../models/Users';
import { PipelineStage, Types } from 'mongoose';
import { ActivityLog } from '../models/ActivityLog';
import { Goal } from '../models/Goal';
import xlsx from 'xlsx';
import csvParser from 'csv-parser';
import { Readable } from 'stream';
import moment from 'moment';

function parseStatuses(s?: string) {
  if (!s) return undefined;
  const allowed = new Set(['new', 'in_progress', 'callback', 'closed', 'dead']);
  const arr = s
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter((v) => allowed.has(v));
  return arr.length ? arr : undefined;
}

function dateRangeFromQuery(q: any, tz = 'Asia/Kolkata') {
  const when = (q.when || 'createdAt') as
    | 'createdAt'
    | 'updatedAt'
    | 'lastCallAt'
    | 'nextCallDate';
  let start: Date | undefined;
  let end: Date | undefined;

  if (q.date === 'today') {
    start = moment.tz(tz).startOf('day').toDate();
    end = moment.tz(tz).endOf('day').toDate();
  } else if (q.date) {
    const d = moment.tz(q.date, 'YYYY-MM-DD', true, tz);
    if (d.isValid()) {
      start = d.startOf('day').toDate();
      end = d.endOf('day').toDate();
    }
  } else if (q.startDate && q.endDate) {
    const s = moment.tz(q.startDate, 'YYYY-MM-DD', true, tz);
    const e = moment.tz(q.endDate, 'YYYY-MM-DD', true, tz);
    if (s.isValid() && e.isValid()) {
      start = s.startOf('day').toDate();
      end = e.endOf('day').toDate();
    }
  }

  return { when, start, end };
}

function csvEscape(val: any): string {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (
    s.includes('"') ||
    s.includes(',') ||
    s.includes('\n') ||
    s.includes('\r')
  ) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildFilename(opts: {
  prefix?: string;
  status?: string[];
  start?: Date;
  end?: Date;
  tz?: string;
  ext: 'csv' | 'xlsx';
}) {
  const now = moment().format('YYYYMMDD_HHmmss');
  const statusPart = opts.status?.length
    ? `_status-${opts.status.join('+')}`
    : '';
  let rangePart = '';
  if (opts.start && opts.end) {
    const tz = opts.tz || 'Asia/Kolkata';
    rangePart = `_${moment(opts.start).tz(tz).format('YYYYMMDD')}-${moment(
      opts.end
    )
      .tz(tz)
      .format('YYYYMMDD')}`;
  }
  return `${opts.prefix || 'leads_export'}${statusPart}${rangePart}_${now}.${
    opts.ext
  }`;
}

function normalizePhone(phone: string): string | null {
  phone = String(phone)
    .trim()
    .replace(/[^\d]+/g, ''); // keep only digits

  // Must have at least 10 digits
  if (phone.length < 10) return null;

  if (phone.startsWith('91') && phone.length === 12) {
    return `+${phone}`;
  }
  if (phone.length === 10) {
    return `+91${phone}`;
  }
  if (phone.startsWith('+') && phone.length > 3) {
    return phone;
  }

  return `+91${phone}`;
}

const projectLookup = new Map(
  PROJECT_OPTIONS.map((p) => [p.toLowerCase(), p])
);
function normalizeProject(project?: string | null): string | undefined {
  if (!project || typeof project !== 'string') return undefined;
  const trimmed = project.trim();
  if (!trimmed) return undefined;
  const hit = projectLookup.get(trimmed.toLowerCase());
  if (hit) return hit;
  return undefined;
}

const allowedStatuses = new Set<ILead['status']>([
  'new',
  'in_progress',
  'callback',
  'closed',
  'dead',
]);
function normalizeStatus(status?: string): ILead['status'] | null {
  if (!status || typeof status !== 'string') return null;
  const val = status.trim().toLowerCase() as ILead['status'];
  return allowedStatuses.has(val) ? val : null;
}

export const createLead = async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { name, phone, behaviour, assignedTo, notes, source, project } =
    req.body;
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admin can create leads' });
  }

  if (!phone) return res.status(400).json({ error: 'Missing required fields' });

  const phoneNorm = normalizePhone(phone);
  const existing = await Lead.findOne({ phone: phoneNorm, active: true });
  if (existing) return res.status(409).json({ error: 'Lead already exists' });

  const projectValue = normalizeProject(project);
  if (project && !projectValue) {
    return res.status(400).json({ error: 'Invalid project value' });
  }

  let leaderId: string | undefined = undefined;
  if (assignedTo) {
    const target = await User.findById(assignedTo);
    if (!target) return res.status(400).json({ error: 'Invalid assignee' });
    leaderId = target.role === 'leader' ? target.id : target.leaderId;
  }

  const lead = await Lead.create({
    name,
    phone: phoneNorm,
    behaviour,
    notes,
    assignedTo: assignedTo ? new Types.ObjectId(assignedTo) : null,
    leaderId,
    source,
    project: projectValue,
    createdBy: user.id,
  });

  // await ActivityLog.create({userId : user.id, action : 'CREATE_LEAD', targetId : leaed})
  res.status(201).json(lead);
};

export const getLead = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;

  const lead = await Lead.findById(id)
    .populate('assignedTo', 'fullName email role')
    .populate('leaderId', 'fullName email role')
    .populate('createdBy', 'fullName email role')
    .populate('updatedBy', 'fullName email role')
    .lean();

  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  //permission check
  if (
    user.role == 'admin' ||
    (user.role === 'telecaller' && String(lead.assignedTo?._id) === user.id) ||
    (user.role === 'leader' && String(lead.leaderId?._id) === user.id)
  ) {
    return res.json(lead);
  }

  return res
    .status(403)
    .json({ error: 'Forbidden : not authorized to view this lead' });
};

export const listLeads = async (req: AuthRequest, res: Response) => {
  const {
    page = '1',
    pageSize = '20',
    status,
    search,
    view = 'all',
  } = req.query as Record<string, string>;
  const p = Math.max(parseInt(page), 1);
  const ps = Math.min(Math.max(parseInt(pageSize), 1), 100);

  const user = req.user!;
  const filter: any = {};

  if (status) {
    const normalizedStatus = normalizeStatus(status);
    if (!normalizedStatus)
      return res.status(400).json({ error: 'Invalid status value' });
    filter.status = normalizedStatus;
  }
  if (search)
    filter.$or = [
      { name: new RegExp(search, 'i') },
      { phone: new RegExp(search, 'i') },
    ];

  if (user.role === 'telecaller') {
    filter.assignedTo = user.id;
  } else if (user.role === 'leader') {
    if (view === 'own') {
      filter.leaderId = user.id;
    }
  }

  const [items, total] = await Promise.all([
    Lead.find(filter)
      .select(
        'name phone status behaviour notes assignedTo leaderId source project createdAt updatedAt lastCallAt callCount nextCallDate'
      )
      .populate('assignedTo', 'fullName email role')
      .populate('leaderId', 'fullName email role')
      .sort({ createdAt: -1 })
      .skip((p - 1) * ps)
      .limit(ps)
      .lean(),
    Lead.countDocuments(filter),
  ]);

  // if (user.role === 'leader') {
  //   items.forEach((lead : any) => lead.ownLead = lead.leaderId?.toISOString)
  // }
  res.json({ items, total, page: p, pageSize, ps });
};

export const updateLead = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const {
    name,
    phone,
    behaviour,
    notes,
    nextCallDate,
    source,
    assignedTo,
    project,
  } = req.body;
  const user = req.user!;
  const lead = await Lead.findById(id);

  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  if (user.role === 'admin') {
    if (name) lead.name = name;
    if (phone) {
      const newPhone = normalizePhone(phone);
      if (newPhone !== lead.phone) {
        const existing = await Lead.findOne({ phone: newPhone, active: true });
        if (existing && String(existing._id) !== id) {
          return res
            .status(409)
            .json({ error: 'Lead already exists with this number.' });
        }
        lead.phone = newPhone;
      }
    }
    if (behaviour) lead.behaviour = behaviour;
    if (notes) lead.notes = notes;
    if (source) lead.source = source;
    if (nextCallDate) lead.nextCallDate = new Date(nextCallDate);
    if (assignedTo) lead.assignedTo = assignedTo;
    if (project !== undefined) {
      const projectValue = normalizeProject(project);
      if (project && !projectValue) {
        return res.status(400).json({ error: 'Invalid project value' });
      }
      lead.project = projectValue;
    }
  }

  if (['leader', 'telecaller'].includes(user.role)) {
    if (behaviour) lead.behaviour = behaviour;
    if (notes) lead.notes = notes;
    if (nextCallDate) lead.nextCallDate = new Date(nextCallDate);
  }

  lead.updatedBy = user.id;
  await lead.save();

  await ActivityLog.create({
    userId: user.id,
    action: 'UPDATE_LEAD',
    targetId: lead._id,
    meta: { behaviour, notes, nextCallDate },
  });

  res.json(lead);
};

export const deleteLead = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  const lead = await Lead.findById(id);

  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admin can delete leads' });
  }

  await lead.deleteOne();
  await ActivityLog.create({
    userId: user.id,
    action: 'DELETE_LEAD',
    targetId: id,
  });

  res.json({ success: true, message: 'Lead deleted successfully' });
};

export const updateLeadStatus = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, notes, nextCallDate, behaviour } = req.body;
  const user = req.user!;

  const normalizedStatus = normalizeStatus(status);
  if (!normalizedStatus)
    return res.status(400).json({ error: 'Invalid status value' });

  const lead = await Lead.findById(id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  if (lead.status !== 'new' && normalizedStatus === 'new') {
    return res.status(400).json({ error: 'Cannot revert status back to new' });
  }

  if (lead.status === 'new' && normalizedStatus !== 'new') {
    lead.callCount += 1;
    lead.lastCallAt = new Date();

    await Goal.findOneAndUpdate(
      {
        userId: user.id,
        type: 'weekly_calls',
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() },
      },
      { $inc: { achieved: 1 } }
    );
  }

  lead.status = normalizedStatus;
  if (behaviour) lead.behaviour = behaviour;
  if (notes) lead.notes = notes;
  if (nextCallDate) lead.nextCallDate = new Date(nextCallDate);
  lead.updatedBy = user.id;

  await lead.save();

  await ActivityLog.create({
    userId: user.id,
    action: 'UPDATE_LEAD_STATUS',
    targetId: lead._id,
    meta: { status, notes, behaviour, nextCallDate },
  });

  res.json({ success: true, lead });
};

export const bulkUpdateLeads = async (req: AuthRequest, res: Response) => {
  const { ids, status } = req.body;
  const user = req.user!;

  if (!Array.isArray(ids) || ids.length === 0)
    return res.status(400).json({ error: 'No leads selected' });

  const normalizedStatus = normalizeStatus(status);
  if (!normalizedStatus)
    return res.status(400).json({ error: 'Invalid status value' });

  const leads = await Lead.find({ _id: { $in: ids } });
  for (const lead of leads) {
    if (lead.status === 'new' && normalizedStatus !== 'new') {
      lead.callCount += 1;
      lead.lastCallAt = new Date();
      await Goal.findOneAndUpdate(
        {
          userId: user.id,
          type: 'weekly_calls',
          startDate: { $lte: new Date() },
          endDate: { $gte: new Date() },
        },
        { $inc: { achieved: 1 } }
      );
    }
    lead.status = normalizedStatus;
    lead.updatedBy = user.id;
    await lead.save();
  }

  await ActivityLog.create({
    userId: user.id,
    action: 'BULK_UPDATE_STATUS',
    meta: { ids, status },
  });

  res.json({ success: true, updatedCount: ids.length });
};

//bulk assign leads
export const bulkAssignLeads = async (req: AuthRequest, res: Response) => {
  const { ids, assignedTo } = req.body;
  const user = req.user!;

  if (user.role !== 'admin')
    return res.status(403).json({ error: 'Only admin can assign leads' });

  const target = assignedTo ? await User.findById(assignedTo) : null;
  if (!target) return res.status(400).json({ error: 'Invalid assignee' });

  await Lead.updateMany(
    { _id: { $in: ids } },
    {
      $set: {
        assignedTo: assignedTo,
        leaderId: target.role === 'leader' ? target.id : target.leaderId,
        updatedBy: user.id,
      },
    }
  );

  await ActivityLog.create({
    userId: user.id,
    action: 'BULK_ASSIGN_LEADS',
    meta: { ids, assignedTo },
  });

  res.json({ success: true, updatedCount: ids.length });
};

export const uploadLeadsUniversal = async (req: AuthRequest, res: Response) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admin can upload leads' });
  }

  if (!req.file) return res.status(400).json({ error: 'File required' });

  const leadsToInsert: any[] = [];
  const errors: any[] = [];

  let rows: any[] = [];

  try {
    const fileExt = req.file.originalname.toLowerCase();

    const isExcel =
      fileExt.endsWith('.xls') ||
      fileExt.endsWith('.xlsx') ||
      req.file.mimetype.includes('excel') ||
      req.file.mimetype.includes('spreadsheet');

    const isCSV =
      fileExt.endsWith('.csv') ||
      req.file.mimetype.includes('text') ||
      req.file.mimetype.includes('csv') ||
      req.file.mimetype === 'application/octet-stream'; // Mac Numbers sometimes uses this
    if (isExcel) {
      const workbook = xlsx.read(req.file.buffer, {
        type: 'buffer',
        cellText: false,
        cellDates: false,
      });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
    } else if (isCSV) {
      const bufferStream = Readable.from(req.file.buffer).pipe(csvParser());
      for await (const row of bufferStream) rows.push(row);
    } else {
      return res.status(400).json({
        error:
          'Unsupported file format. Use CSV or Excel export from any software.',
        detectedType: req.file.mimetype,
        originalFile: req.file.originalname,
      });
    }
  } catch (e) {
    return res.status(500).json({ error: 'Failed to read file', detail: e });
  }

  // Process rows
  for (const rawRow of rows) {
    try {
      // Normalize column names
      const row: any = {};
      Object.keys(rawRow).forEach((key) => {
        if (!key) return;
        row[
          key
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
        ] = rawRow[key];
      });

      const values = Object.values(rawRow).filter((v) => v !== '');

      const mobile =
        row.mobile_number ||
        row.phone ||
        row.mobile ||
        row.contact ||
        (values.length >= 3 ? values[2] : null);

      const name = row.name || values?.[1];
      const source = row.source || values?.[3] || 'Unknown';
      const executive_email =
        row.executive_email || row.executive || values?.[4];
      const rawProject = row.project;
      const projectValue = normalizeProject(rawProject);
      if (rawProject && !projectValue) {
        throw `Invalid project: ${rawProject}`;
      }

      if (!mobile) throw 'Mobile number missing';
      if (!executive_email) throw 'Executive email missing';

      // Convert number → string format
      const formattedMobile = normalizePhone(mobile);
      if (!formattedMobile) throw 'Invalid mobile number';
      // if (!/^\d{6,}$/.test(formattedMobile))
      //   throw 'Invalid mobile number format';

      // Check if lead already exists
      const existing = await Lead.findOne({
        phone: formattedMobile,
        active: true,
      });
      if (existing) throw 'Lead already exists';

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(executive_email.trim())) {
        throw `Invalid email format: ${executive_email}`;
      }

      const assignedUser = await User.findOne({
        email: executive_email.trim(),
      });
      if (!assignedUser) throw `No user found: ${executive_email}`;

      leadsToInsert.push({
        name: name || 'Unnamed',
        phone: formattedMobile,
        source,
        project: projectValue,
        assignedTo: assignedUser._id,
        leaderId:
          assignedUser.role === 'leader'
            ? assignedUser._id
            : assignedUser.leaderId,
        createdBy: req.user.id,
      });
    } catch (error) {
      errors.push({ row: rawRow, error });
    }
  }

  if (leadsToInsert.length > 0) await Lead.insertMany(leadsToInsert);

  res.json({
    success: true,
    inserted: leadsToInsert.length,
    failed: errors.length,
    errors,
  });
};

export const exportLeads = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { format = 'csv', status, tz = 'Asia/Kolkata' } = req.query as any;

    const statuses = parseStatuses(status);
    const { when, start, end } = dateRangeFromQuery(req.query, tz);

    // ---- Role-aware filter
    const filter: any = { active: true };
    if (statuses) filter.status = { $in: statuses };
    if (start && end) filter[when] = { $gte: start, $lte: end };

    if (user.role === 'telecaller') {
      filter.assignedTo = new Types.ObjectId(user.id);
    } else if (user.role === 'leader') {
      filter.leaderId = new Types.ObjectId(user.id);
    }

    // ---- Build a compact user-map (names) for assignedTo/leaderId/createdBy
    const distinctAgg: PipelineStage[] = [
      { $match: filter },
      {
        $group: {
          _id: null,
          assigned: { $addToSet: '$assignedTo' },
          leaders: { $addToSet: '$leaderId' },
          creators: { $addToSet: '$createdBy' },
        },
      },
      {
        $project: {
          all: { $setUnion: ['$assigned', '$leaders', '$creators'] },
        },
      },
    ];

    const agg = await Lead.aggregate(distinctAgg);
    const userIds: Types.ObjectId[] = (agg[0]?.all || []).filter(Boolean);

    const users = userIds.length
      ? await User.find({ _id: { $in: userIds } })
          .select('fullName')
          .lean()
      : [];

    const nameOf = (id?: any) => {
      if (!id) return '';
      const hit = users.find((u: any) => String(u._id) === String(id));
      return hit?.fullName || '';
    };

    // ---- Projection for streaming query (no updatedAt)
    const projection =
      'name phone status behaviour notes source project assignedTo leaderId createdBy createdAt nextCallDate lastCallAt callCount';

    // ---- Stream selection
    const ext = format === 'xlsx' ? 'xlsx' : 'csv';
    const filename = buildFilename({
      prefix: 'leads',
      status: statuses,
      start,
      end,
      tz,
      ext,
    });

    // HEADERS
    if (ext === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    } else {
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
    }
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Transfer-Encoding', 'chunked');

    const cursor = Lead.find(filter)
      .select(projection)
      .sort({ _id: 1 })
      .lean()
      .cursor({ batchSize: 1000 });

    let closed = false;
    res.on('close', () => {
      closed = true;
      try {
        cursor.close();
      } catch {}
    });

    const headers = [
      'Name',
      'Phone',
      'Status',
      'Behaviour',
      'Notes',
      'Source',
      'Project',
      'Assigned To',
      'Leader',
      'Created By',
      'Created At',
      'Last Call',
      'Next Call',
      'Call Count',
    ];

    const fmtDate = (d?: any) =>
      d ? moment(d).tz(tz).format('YYYY-MM-DD HH:mm') : '';

    if (ext === 'csv') {
      // UTF-8 BOM for Excel
      res.write('\ufeff');
      res.write(headers.map(csvEscape).join(',') + '\n');

      for await (const doc of cursor as any) {
        if (closed) break;

        const row = [
          doc.name ?? '',
          doc.phone ?? '',
          doc.status ?? '',
          doc.behaviour ?? '',
          doc.notes ?? '',
          doc.source ?? '',
          doc.project ?? '',
          nameOf(doc.assignedTo),
          nameOf(doc.leaderId),
          nameOf(doc.createdBy),
          fmtDate(doc.createdAt),
          fmtDate(doc.lastCallAt),
          fmtDate(doc.nextCallDate),
          doc.callCount ?? 0,
        ];

        res.write(row.map(csvEscape).join(',') + '\n');
      }

      if (!closed) res.end();
      return;
    }

    // === XLSX streaming (exceljs)
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
        stream: res,
        useStyles: false,
        useSharedStrings: false,
      });
      const sheet = workbook.addWorksheet('Leads');
      sheet.addRow(headers).commit();

      for await (const doc of cursor as any) {
        if (closed) break;

        sheet
          .addRow([
            doc.name ?? '',
            doc.phone ?? '',
            doc.status ?? '',
            doc.behaviour ?? '',
            doc.notes ?? '',
            doc.source ?? '',
            doc.project ?? '',
            nameOf(doc.assignedTo),
            nameOf(doc.leaderId),
            nameOf(doc.createdBy),
            fmtDate(doc.createdAt),
            fmtDate(doc.lastCallAt),
            fmtDate(doc.nextCallDate),
            doc.callCount ?? 0,
          ])
          .commit();
      }

      await workbook.commit(); // ends response
    } catch (e) {
      // Fallback to CSV if exceljs is missing
      if (!closed) {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${filename.replace('.xlsx', '.csv')}"`
        );
        res.write('\ufeff');
        res.write(headers.map(csvEscape).join(',') + '\n');

        const fallback = Lead.find(filter)
          .select(projection)
          .sort({ _id: 1 })
          .lean()
          .cursor({ batchSize: 1000 });

        for await (const doc of fallback as any) {
          if (closed) break;
          const row = [
            doc.name ?? '',
            doc.phone ?? '',
            doc.status ?? '',
            doc.behaviour ?? '',
            doc.notes ?? '',
            doc.source ?? '',
            nameOf(doc.assignedTo),
            nameOf(doc.leaderId),
            nameOf(doc.createdBy),
            fmtDate(doc.createdAt),
            fmtDate(doc.lastCallAt),
            fmtDate(doc.nextCallDate),
            doc.callCount ?? 0,
          ];
          res.write(row.map(csvEscape).join(',') + '\n');
        }
        res.end();
      }
    }
  } catch (err) {
    console.error('exportLeads error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to export leads' });
    }
  }
};
