import { Document, model, Schema, Types } from 'mongoose';

export interface ILead extends Document {
  name: string;
  phone: string;
  notes?: string;
  status: 'new' | 'in_progress' | 'callback' | 'closed' | 'dead';
  behaviour?: 'warm' | 'hot' | 'cold';
  assignedTo?: Types.ObjectId | null;
  leaderId?: Types.ObjectId | null;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId | string;
  nextCallDate?: Date;
  callCount: number;
  lastCallAt?: Date;
  source?: string;
  active: boolean;
  project?: string;
}

export const PROJECT_OPTIONS = [
  'Shreya Valley',
  'Shreya Nakshtra',
  'Shreya Heights',
  'Shreya Residency',
  'Shreya City',
  'Samarth Park 1',
  'Samarth Park 2',
  'Samarth Park 3',
  'Shreedatta Park',
  'Shreya Paradise',
  'Shreya Park 1',
  'Shreya Park 2',
  'Shreya Park 3',
  'Shreya Villa 1',
  'Shreya Villa 2',
  'Shreya Greens',
] as const;

const leadSchema = new Schema<ILead>(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, trim: true },
    notes: String,
    behaviour: {
      type: String,
      enum: ['warm', 'hot', 'cold'],
      default: null,
    },
    status: {
      type: String,
      enum: ['new', 'in_progress', 'callback', 'closed', 'dead'],
      default: 'new',
      index: true,
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    leaderId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    callCount: { type: Number, default: 0 },
    lastCallAt: Date,
    nextCallDate: Date,
    active: { type: Boolean, default: true },
    source: { type: String, trim: true },
    project: {
      type: String,
      enum: PROJECT_OPTIONS,
      default: undefined,
      trim: true,
    },
  },
  { timestamps: true }
);

leadSchema.index({ assignedTo: 1 });
leadSchema.index({ leaderId: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ phone: 1, active: 1 }, { unique: true });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ status: 1, createdAt: -1 });
leadSchema.index({ leaderId: 1, createdAt: -1 });
leadSchema.index({ assignedTo: 1, createdAt: -1 });
leadSchema.index({ assignedTo: 1, status :1, createdAt: -1 });

export const Lead = model<ILead>('Lead', leadSchema);
