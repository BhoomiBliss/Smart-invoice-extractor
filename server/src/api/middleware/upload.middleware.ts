// ==============================================================================
// MIDDLEWARE: FILE UPLOAD FILTERS - INVOICEFLOW AI
// ==============================================================================

import multer from 'multer';
import { Request } from 'express';
import { MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES } from '@multi-agent-invoice/shared';

const storage = multer.memoryStorage(); // Stream buffers directly for ingestion processing

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const isAllowedMime = ALLOWED_MIME_TYPES.includes(file.mimetype as any);
  
  if (isAllowedMime) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type. Accepted formats: ${ALLOWED_MIME_TYPES.join(', ')}`));
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES
  },
  fileFilter
});

export default upload;
