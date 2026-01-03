import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Goal, GoalType } from '../models/Goal';
import { ActivityLog } from '../models/ActivityLog';
import moment from 'moment-timezone';

function computeWeekWindow(tz = 'Asia/Kolkata', startISO?: string, endISO?: string) {
  if (startISO && endISO) {
    const s = moment.tz(startISO, tz).startOf('day');
    const e = moment.tz(endISO, tz).endOf('day');
    return { start: s.toDate(), end: e.toDate() };
  }
  // ISO week = Monday start; change to startOf('week') if you prefer Sunday
  const start = moment.tz(tz).startOf('isoWeek');
  const end = moment.tz(tz).endOf('isoWeek');
  return { start: start.toDate(), end: end.toDate() };
}

export const createGoal = async (req: AuthRequest, res: Response) => {
  try {
    const { userId: bodyUserId, target, startDate, endDate, tz } = req.body as {
      userId?: string;
      target: number;
      startDate?: string;
      endDate?: string;
      tz?: string; // optional override; default IST
    };

    if (typeof target !== 'number' || Number.isNaN(target)) {
      return res.status(400).json({ error: 'target is required (number)' });
    }

    const userId = bodyUserId || req.user!.id;
    const { start, end } = computeWeekWindow(tz || 'Asia/Kolkata', startDate, endDate);

    // Upsert the goal that overlaps the current week-window.
    // Do NOT clobber 'achieved' on update.
    const filter = {
      userId,
      type: 'weekly_calls',
      period: 'weekly',
      startDate: { $lte: end },
      endDate: { $gte: start },
    };

    const update = {
      $set: { target, startDate: start, endDate: end },
      $setOnInsert: { achieved: 0 },
    };

    const goal = await Goal.findOneAndUpdate(filter, update, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    });

    await ActivityLog.create({
      userId: req.user!.id!,
      action:  'UPDATE_GOAL',
      targetId: goal._id,
    });

    return res.status(goal ? 200 : 201).json(goal);
  } catch (err) {
    console.error('createGoal error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
export const listGoals = async (req: AuthRequest, res: Response) => {
  const filter: any = {};
  if (req.user!.role !== 'admin') filter.userId = req.user!.id;

  const goals = await Goal.find(filter)
    .populate('userId', 'firstName lastName email role')
    .sort({ createdAt: -1 });

  res.json(goals);
};
