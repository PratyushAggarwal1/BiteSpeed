import { Request, Response, NextFunction } from 'express';
import * as identityService from '../services/identityService';

export const identifyContact = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, phoneNumber } = req.body;

    // Basic validation
    if (!email && !phoneNumber) {
      return res.status(400).json({
        error: 'Either email or phoneNumber must be provided.',
      });
    }

    const result = await identityService.processIdentity({
      email: email ? String(email) : null, // Ensure email is string or null
      phoneNumber: phoneNumber ? String(phoneNumber) : null, // Ensure phoneNumber is string or null
    });

    return res.status(200).json({ contact: result });
  } catch (error) {
    next(error); // Pass error to the error handling middleware
  }
};