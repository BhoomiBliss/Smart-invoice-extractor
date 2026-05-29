// ==============================================================================
// MIDDLEWARE: ZOD REQUEST BODY VALIDATOR - INVOICEFLOW AI
// ==============================================================================

import { Request, Response, NextFunction } from 'express';
import { AnyZodObject } from 'zod';

export const validateRequest = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ERR_VALIDATION_FAILED',
          message: 'Invalid request body payload provided.',
          details: error.errors
        },
        traceId: (req as any).traceId || ''
      });
    }
  };
};

export default validateRequest;
