import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/Users';
import { ActivityLog } from '../models/ActivityLog';
import { Goal } from '../models/Goal';
import moment from 'moment';
import { Lead } from '../models/Lead';
import { CallLog } from '../models/Call';

/* ======================================================
   📌 LIST USERS
====================================================== */
export const listUsers = async (req: AuthRequest, res: Response) => {
  const {
    page = '1',
    pageSize = '20',
    role,
    search,
  } = req.query as Record<string, string>;
  const p = Math.max(parseInt(page), 1);
  const ps = Math.min(Math.max(parseInt(pageSize), 1), 100);

  const filter: any = {};
  if (role) filter.role = role;
  if (search) {
    filter.$or = [
      { email: new RegExp(search, 'i') },
      { fullName: new RegExp(search, 'i') },
    ];
  }

  // Leader can only see themselves + their telecallers
  if (req.user!.role === 'leader') {
    filter.$or = [
      { _id: new mongoose.Types.ObjectId(req.user!.id) },
      { leaderId: new mongoose.Types.ObjectId(req.user!.id) },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip((p - 1) * ps)
      .limit(ps),
    User.countDocuments(filter),
  ]);

  // Attach weekly goals (only active ones)
  const userIds = users.map((u) => u._id);
  const goals = await Goal.find({
    userId: { $in: userIds },
    type: 'weekly_calls',
    endDate: { $gte: new Date() },
  }).lean();

  const items = users.map((u) => {
    const userGoal = goals.find((g) => String(g.userId) === String(u._id));
    return {
      ...u.toObject(),
      weeklyGoal: userGoal || null,
    };
  });

  res.json({ items, total, page: p, pageSize: ps });
};

/* ======================================================
   📌 CREATE USER
====================================================== */
export const createUser = async (req: AuthRequest, res: Response) => {
  const { firstName, lastName, email, phone, password, role, leaderId } =
    req.body;
  if (!firstName || !email || !password || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (req.user!.role === 'leader' && role !== 'telecaller') {
    return res
      .status(403)
      .json({ error: 'Leader can only create telecallers' });
  }

  if (req.user!.role === 'leader' && leaderId && leaderId !== req.user!.id) {
    return res.status(400).json({ error: 'leaderId must be own ID' });
  }

  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ error: 'Email already exists' });

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await User.create({
    firstName,
    lastName,
    email,
    phone,
    passwordHash,
    role,
    leaderId:
      role === 'telecaller'
        ? req.user!.role === 'leader'
          ? req.user!.id
          : leaderId || null
        : null,
  });

  await ActivityLog.create({
    userId: req.user!.id,
    action: 'CREATE_USER',
    targetId: user._id,
    meta: { email: user.email, role: user.role },
  });

  res.status(201).json({
    id: user._id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    leaderId: user.leaderId,
  });
};

/* ======================================================
   📌 UPDATE USER (Admin Only)
====================================================== */
export const updateUser = async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'admin')
    return res.status(403).json({ error: 'Only admin can update users' });

  const { id } = req.params;
  const { firstName, lastName, phone, password, role, active, leaderId } =
    req.body;
  const update: any = {};

  if (firstName) update.firstName = firstName;
  if (lastName) update.lastName = lastName;
  if (phone) update.phone = phone;
  if (password) update.passwordHash = await bcrypt.hash(password, 10);
  if (role) update.role = role;
  if (active !== undefined) update.active = active;
  if (leaderId && role === 'telecaller')
    update.leaderId = new mongoose.Types.ObjectId(leaderId);
  if (firstName || lastName)
    update.fullName = `${firstName ?? ''} ${lastName ?? ''}`.trim();

  const user = await User.findByIdAndUpdate(id, update, { new: true })
    .select('-passwordHash')
    .populate('leaderId', 'fullName email role');

  if (!user) return res.status(404).json({ error: 'User not found' });

  await ActivityLog.create({
    userId: req.user!.id,
    action: 'UPDATE_USER',
    targetId: id,
    meta: { updatedFields: Object.keys(update) },
  });

  res.json(user);
};

/* ======================================================
   📌 GET USER + ACTIVE WEEKLY GOAL
====================================================== */
export const getUser = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const user = await User.findById(id)
    .select('-passwordHash')
    .populate('leaderId', 'fullName email role');

  if (!user) return res.status(404).json({ error: 'User not found' });

  const requester = req.user!;
  const allowed =
    requester.role === 'admin' ||
    requester.id === id ||
    (requester.role === 'leader' && String(user.leaderId) === requester.id);

  if (!allowed) return res.status(403).json({ error: 'Forbidden' });

  const goal = await Goal.findOne({
    userId: id,
    type: 'weekly_calls',
    endDate: { $gte: new Date() },
  }).lean();

  res.json({ ...user.toObject(), weeklyGoal: goal || null });
};

/* ======================================================
   📌 DELETE USER
====================================================== */
export const deleteUser = async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'admin')
    return res.status(403).json({ error: 'Only admin can delete user' });
  const { id } = req.params;

  const target = await User.findById(id);
  if (!target) return res.status(404).json({ error: 'User not found' });

  if (String(req.user!.id) === String(id))
    return res.status(403).json({ error: 'Cannot delete own account' });

  if (
    target.role === 'admin' &&
    (await User.countDocuments({ role: 'admin' })) <= 1
  ) {
    return res.status(400).json({ error: 'Cannot delete last admin' });
  }

  await User.findByIdAndDelete(id);

  await ActivityLog.create({
    userId: req.user!.id,
    action: 'DELETE_USER',
    targetId: id,
    meta: { email: target.email, role: target.role },
  });

  res.json({ success: true });
};
//?range=day&startDate=
export const getTelecallerLeads = async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const {
    range = 'day',
    startDate,
    endDate,
    status,
    page = '1',
    pageSize = '20',
    search,
  } = req.query as any;
  console.log(status, 'check');
  const requester = req.user!;
  if (requester.role === 'telecaller' && requester.id !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Build date range
  let start: Date, end: Date;
  const now = moment();
  if (range === 'week') {
    start = now.startOf('week').toDate();
    end = now.endOf('week').toDate();
  } else if (range === 'month') {
    start = now.startOf('month').toDate();
    end = now.endOf('month').toDate();
  } else if (range === 'custom' && startDate && endDate) {
    start = new Date(startDate);
    end = new Date(endDate);
  } else {
    start = now.startOf('day').toDate();
    end = now.endOf('day').toDate();
  }

  const p = Math.max(parseInt(page), 1);
  const ps = Math.min(Math.max(parseInt(pageSize), 1), 100);

  const filter: any = { assignedTo: userId };
  // if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { name: new RegExp(search, 'i') },
      { phone: new RegExp(search, 'i') },
      { notes: new RegExp(search, 'i') },
    ];
  }

  const [leads, total] = await Promise.all([
    Lead.find(filter)
      .where({ createdAt: { $lte: end } })
      .populate('assignedTo', 'fullName email')
      .skip((p - 1) * ps)
      .limit(ps)
      .sort({ lastCallAt: -1 })
      .lean(),
    Lead.countDocuments(filter),
  ]);

  res.json({
    success: true,
    dateRange: { start, end },
    page: p,
    pageSize: ps,
    total,
    items: leads,
  });
};

export const getTelecallerCalls = async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const {
    range = 'day',
    startDate,
    endDate,
    search,
    page = '1',
    pageSize = '20',
    result,
  } = req.query as any;

  const requester = req.user!;
  if (requester.role === 'telecaller' && requester.id !== userId)
    return res.status(403).json({ error: 'Access denied' });

  let start: Date, end: Date;
  const now = moment();
  if (range === 'week') {
    start = now.startOf('week').toDate();
    end = now.endOf('week').toDate();
  } else if (range === 'month') {
    start = now.startOf('month').toDate();
    end = now.endOf('month').toDate();
  } else if (range === 'custom' && startDate && endDate) {
    start = new Date(startDate);
    end = new Date(endDate);
  } else {
    start = now.startOf('day').toDate();
    end = now.endOf('day').toDate();
  }

  const p = Math.max(parseInt(page), 1);
  const ps = Math.min(Math.max(parseInt(pageSize), 1), 100);

  const logFilter: any = { telecallerId: userId };
  if (search) {
    logFilter.$or = [
      { remarks: new RegExp(search, 'i') },
      { result: new RegExp(search, 'i') },
    ];
  }

  if (result) { 
    logFilter.result = result
  }

  const [logs, total] = await Promise.all([
    CallLog.find(logFilter)
      .where({ createdAt: { $gte: start, $lte: end } })
      .populate('leadId', 'name phone status nextCallDate behaviour')
      .sort({ createdAt: -1 })
      .skip((p - 1) * ps)
      .limit(ps)
      .lean(),
    CallLog.countDocuments(logFilter),
  ]);

  res.json({
    success: true,
    dateRange: { start, end },
    page: p,
    pageSize: ps,
    total,
    items: logs,
  });
};

export const getTelecallerGoal = async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;

  const goal = await Goal.findOne({
    userId,
    type: 'weekly_calls',
    endDate: { $gte: new Date() },
  });

  res.json({ success: true, weeklyGoal: goal || null });
};

export const getTelecallerDashboard = async (
  req: AuthRequest,
  res: Response
) => {
  const { userId } = req.params;
  const requester = req.user!;
  if (requester.role === 'telecaller' && requester.id !== userId)
    return res.status(403).json({ error: 'Access denied' });

  // --- Range params ---------------------------------------------------------
  const { range = 'day', startDate, endDate } = req.query as any;

  const computeRange = () => {
    const now = moment();
    if (range === 'week') {
      return {
        start: now.clone().startOf('week').toDate(),
        end: now.clone().endOf('week').toDate(),
      };
    }
    if (range === 'month') {
      return {
        start: now.clone().startOf('month').toDate(),
        end: now.clone().endOf('month').toDate(),
      };
    }
    if (range === 'custom' && startDate && endDate) {
      return {
        start: moment(startDate).startOf('day').toDate(),
        end: moment(endDate).endOf('day').toDate(),
      };
    }
    // default: 'day'
    return {
      start: now.clone().startOf('day').toDate(),
      end: now.clone().endOf('day').toDate(),
    };
  };

  const { start, end } = computeRange();
  const todayStart = moment().startOf('day').toDate();
  const todayEnd = moment().endOf('day').toDate();

  const teleId = new mongoose.Types.ObjectId(userId);

  // --- Common matches -------------------------------------------------------
  const callsAllMatch = { telecallerId: teleId };
  const callsRangeMatch = {
    telecallerId: teleId,
    createdAt: { $gte: start, $lte: end },
  };
  const callsTodayMatch = {
    telecallerId: teleId,
    createdAt: { $gte: todayStart, $lte: todayEnd },
  };

  const leadsAllMatch = { assignedTo: teleId };
  const leadsRangeMatch = {
    assignedTo: teleId,
    createdAt: { $gte: start, $lte: end },
  };
  const leadsTodayMatch = {
    assignedTo: teleId,
    createdAt: { $gte: todayStart, $lte: todayEnd },
  };

  // --- Queries --------------------------------------------------------------
  const [
    // Counts
    todayCalls,
    totalCallsAll,
    callsInRange,

    todayLeads,
    totalLeadsAll,
    leadsInRange,

    // Goal (active)
    weeklyGoalDoc,

    // Distributions (range-scoped)
    callsByResultAgg,
    leadsByStatusAgg,

    // Recents
    recentLeads,
    recentCalls,
  ] = await Promise.all([
    // calls
    CallLog.countDocuments(callsTodayMatch),
    CallLog.countDocuments(callsAllMatch),
    CallLog.countDocuments(callsRangeMatch),

    // leads
    Lead.countDocuments(leadsTodayMatch),
    Lead.countDocuments(leadsAllMatch),
    Lead.countDocuments(leadsRangeMatch),

    // goal
    Goal.findOne({
      userId: teleId,
      type: 'weekly_calls',
      endDate: { $gte: new Date() },
    }).lean(),

    // callsByResult in period
    CallLog.aggregate([
      { $match: callsRangeMatch },
      {
        $project: {
          result: {
            $toLower: {
              $ifNull: ['$result', 'unknown'],
            },
          },
        },
      },
      { $group: { _id: '$result', count: { $sum: 1 } } },
    ]),

    // leadsByStatus in period
    Lead.aggregate([
      { $match: leadsRangeMatch },
      {
        $project: {
          status: {
            $toLower: {
              $ifNull: ['$status', 'unknown'],
            },
          },
        },
      },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),

    // recent leads / calls
    Lead.find({ assignedTo: teleId }).sort({ updatedAt: -1 }).limit(5).lean(),
    CallLog.find({ telecallerId: teleId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('leadId', 'name phone')
      .lean(),
  ]);

  // Goal achieved within goal window
  let weeklyGoal = null as null | {
    target: number;
    achieved: number;
    startDate: Date;
    endDate: Date;
  };

  if (weeklyGoalDoc) {
    const goalStart = weeklyGoalDoc.startDate
      ? new Date(weeklyGoalDoc.startDate)
      : moment().startOf('week').toDate();
    const goalEnd = weeklyGoalDoc.endDate
      ? new Date(weeklyGoalDoc.endDate)
      : moment().endOf('week').toDate();
    const goalTarget =
      (weeklyGoalDoc as any).target ?? (weeklyGoalDoc as any).callsTarget ?? 0;

    const achieved = await CallLog.countDocuments({
      telecallerId: teleId,
      createdAt: { $gte: goalStart, $lte: goalEnd },
    });

    weeklyGoal = {
      target: Number(goalTarget) || 0,
      achieved,
      startDate: goalStart,
      endDate: goalEnd,
    };
  }

  // Convert aggs -> dicts
  const callsByResult: Record<string, number> = {};
  for (const r of callsByResultAgg) callsByResult[r._id] = r.count;

  const leadsByStatus: Record<string, number> = {};
  for (const r of leadsByStatusAgg) leadsByStatus[r._id] = r.count;

  return res.json({
    success: true,
    userId,
    dateRange: { start, end },

    totals: {
      leads: totalLeadsAll,
      calls: totalCallsAll,
    },

    today: {
      leads: todayLeads,
      calls: todayCalls,
    },

    period: {
      leads: leadsInRange,
      calls: callsInRange,
    },

    distributions: {
      callsByResult,
      leadsByStatus,
    },

    performance: {
      weeklyGoal,
    },

    overview: {
      recentLeads,
      recentCalls,
    },
  });
};
