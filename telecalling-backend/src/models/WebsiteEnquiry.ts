import { model, Schema, Types } from 'mongoose';

export type EnquiryStatus = 'new' | 'in_progress' | 'done';

export interface WebsiteEnquiry {
  _id: Types.ObjectId;
  name: string;
  phone?: string;
  email?: string;

  status: EnquiryStatus;
  createdAt: Date;
  updatedAt: Date;
}

const WebsiteEnquirySchema = new Schema<WebsiteEnquiry>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true },
    email: { type: String, trim: true, lowercase: true },
    status: {
      type: String,
      enum: ['new', 'done'],
      default: 'new',
      index: true,
    },
  },
  { timestamps: true }
);

WebsiteEnquirySchema.index({ createdAt: -1 });
WebsiteEnquirySchema.index({ name: 'text', email: 'text', phone: 'text' });

export const WebsiteEnquiryModel = model<WebsiteEnquiry>(
  'WebsiteEnquiry',
  WebsiteEnquirySchema
);
