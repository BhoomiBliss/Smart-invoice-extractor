// ==============================================================================
// MIDDLEWARE: RBAC ROLE SEGMENTATION - INVOICEFLOW AI
// ==============================================================================

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { UserRole } from '@multi-agent-invoice/shared';

export const roleGuard = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        error: {
          code: 'ERR_AUTH_REQUIRED',
          message: 'Authentication credentials are required to access this resource.'
        },
        traceId: req.traceId || ''
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        error: {
          code: 'ERR_FORBIDDEN',
          message: 'Forbidden: You have insufficient credentials to run this action.'
        },
        traceId: req.traceId || ''
      });
    }

    next();
  };
};

export default roleGuard;
