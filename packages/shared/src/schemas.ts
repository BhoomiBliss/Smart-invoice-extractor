import { z } from 'zod';

// ------------------------------------------------------------------------------
// Authentication Schemas
// ------------------------------------------------------------------------------
export const signUpSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  email: z.string().email({ message: 'Invalid email address' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long' })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/, {
      message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
    }),
});

export const signInSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
});

// ------------------------------------------------------------------------------
// Invoice Content & Update Schemas
// ------------------------------------------------------------------------------
export const fieldConfidenceSchema = <T extends z.ZodTypeAny>(valueSchema: T) =>
  z.object({
    value: valueSchema,
    confidence: z.number().min(0).max(1),
  });

export const lineItemSchema = z.object({
  description: z.string().min(1, { message: 'Description is required' }),
  quantity: z.number().min(0),
  price: z.number().min(0),
  amount: z.number().min(0),
});

export const invoiceUpdateSchema = z.object({
  vendor: z.string().min(1, { message: 'Vendor name is required' }),
  recipient: z.string().min(1, { message: 'Recipient name is required' }),
  invoiceNumber: z.string().min(1, { message: 'Invoice number is required' }),
  date: z.string().min(1, { message: 'Date is required' }),
  dueDate: z.string().min(1, { message: 'Due date is required' }),
  currency: z.string().min(1, { message: 'Currency code is required' }),
  totalAmount: z.number().min(0),
  taxAmount: z.number().min(0),
  lineItems: z.array(lineItemSchema),
});
export type InvoiceUpdatePayload = z.infer<typeof invoiceUpdateSchema>;
