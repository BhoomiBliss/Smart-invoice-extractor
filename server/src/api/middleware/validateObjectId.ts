// ==============================================================================
// MIDDLEWARE: OBJECT ID VALIDATOR - INVOICEFLOW AI
// ==============================================================================

import mongoose from 'mongoose';
import { Request, Response, NextFunction } from 'express';

export const validateObjectId = (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  if (id && !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'ERR_VALIDATION_FAILED',
        message: `The provided identifier '${id}' is not a valid 24-character hexadecimal ObjectId.`
      },
      traceId: (req as any).traceId || ''
    });
  }
  next();
};

export default validateObjectId;
