import { NextFunction, Request, Response } from 'express';

export function verifySiteToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.get('x-site-token') || req.query.token?.toString();
  const expected = process.env.WEBSITE_ENQUIRY_TOKEN;
  if (!expected)
    return res.status(500).json({ message: 'Site token now configured' });
  if (!token || token !== expected)
    return res.status(401).json({ message: 'Invalid site token' });
  next();
}
