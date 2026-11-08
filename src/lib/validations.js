import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const fuelRateSchema = z.object({
  fuelType: z.string().trim().min(1, 'Fuel type is required'),
  rate: z.coerce.number().positive('Fuel rate must be greater than zero'),
});

export const operatorSchema = z.object({
  name: z.string().trim().min(2, 'Operator name must be at least 2 characters'),
  phone: z.string().trim().optional().default(''),
  active: z.boolean().optional().default(true),
});

export const inventoryItemSchema = z.object({
  name: z.string().trim().min(1, 'Item name is required'),
  category: z.string().trim().min(1, 'Category is required'),
  stock: z.coerce.number().min(0, 'Stock cannot be negative'),
  price: z.coerce.number().min(0, 'Price cannot be negative'),
});

export const singleFuelReadingSchema = z.object({
  fuelType: z.string().min(1),
  openingReading: z.coerce.number().min(0),
  closingReading: z.coerce.number().min(0),
  testingQty: z.coerce.number().min(0).optional().default(0),
  rate: z.coerce.number().positive(),
}).refine(data => data.closingReading >= data.openingReading, {
  message: 'Closing meter reading cannot be less than opening reading',
  path: ['closingReading'],
});

export const inventorySaleItemSchema = z.object({
  inventoryId: z.string().min(1, 'Inventory ID is required'),
  name: z.string().min(1, 'Item name is required'),
  quantity: z.coerce.number().positive('Quantity must be greater than zero'),
  rate: z.coerce.number().min(0),
});

export const expenseSchema = z.object({
  description: z.string().trim().min(1, 'Expense description required'),
  amount: z.coerce.number().positive('Expense amount must be positive'),
});

export const debtEntrySchema = z.object({
  clientName: z.string().trim().min(1, 'Client name is required'),
  amount: z.coerce.number().positive('Debt amount must be positive'),
  settled: z.boolean().optional().default(false),
});

export const dailySaleSchema = z.object({
  saleType: z.enum(['fuel', 'inventory']).default('fuel'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  operatorId: z.string().min(1, 'Operator is required'),
  operatorName: z.string().optional().default(''),
  pumpNumber: z.coerce.number().optional(),
  fuels: z.array(singleFuelReadingSchema).optional(),
  items: z.array(inventorySaleItemSchema).optional(),
  cashAmount: z.coerce.number().min(0).optional().default(0),
  digitalAmount: z.coerce.number().min(0).optional().default(0),
  hpAmount: z.coerce.number().min(0).optional().default(0),
  expenses: z.array(expenseSchema).optional().default([]),
  debtEntries: z.array(debtEntrySchema).optional().default([]),
});
