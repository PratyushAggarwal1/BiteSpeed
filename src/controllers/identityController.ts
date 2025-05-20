import { Request, Response, NextFunction, RequestHandler } from 'express';
import * as identityService from '../services/identityService';

export const identifyContact: RequestHandler = async (req, res, next) => {
  try {
    const { email, phoneNumber } = req.body;

    // Basic validation: Ensure at least one identifier is provided
    if (!email && !phoneNumber) {
      // Send response and explicitly return to stop further execution in this handler
      res.status(400).json({
        error: 'Either email or phoneNumber must be provided.',
      });
      return;
    }

    const result = await identityService.processIdentity({
      email: email ? String(email) : null, // Ensure email is string or null
      phoneNumber: phoneNumber ? String(phoneNumber) : null, // Ensure phoneNumber is string or null
    });

    // Send the successful response
    res.status(200).json({ contact: result });
    // No explicit 'return;' needed here if this is the last statement in the try block,
    // but adding it for clarity or if more code followed wouldn't hurt.
    // The function will implicitly complete its promise.

  } catch (error) {
    // Pass errors to the centralized error handling middleware
    next(error);
    // No explicit 'return;' needed here as next() handles control flow
  }
};
