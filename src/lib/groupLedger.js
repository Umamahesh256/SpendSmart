import { z } from 'zod';

// Schema for adding a contribution (Received Funds)
export const contributionSchema = z.object({
  user_id: z.string().uuid({ message: "Please select a valid member" }),
  amount: z.coerce.number().positive({ message: "Amount must be a positive number" }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Invalid date format" }),
  note: z.string().max(200, { message: "Note must be under 200 characters" }).optional(),
});

// Schema for group expense
export const groupExpenseSchema = z.object({
  amount: z.coerce.number().positive({ message: "Amount must be a positive number" }),
  description: z.string().min(1, { message: "Description is required" }).max(100),
  category: z.string().min(1, { message: "Category is required" }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Invalid date format" }),
  payment_source: z.enum(['group_fund', 'personal_pocket']),
  is_split: z.boolean().optional(),
  split_members: z.array(z.string().uuid()).optional(),
});

/**
 * Calculates the pool balance and statistics
 * @param {Array} contributions 
 * @param {Array} expenses 
 */
export const calculatePoolStats = (contributions = [], expenses = []) => {
  const totalInflow = contributions.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
  
  const totalOutflow = expenses
    .filter(e => e.payment_source === 'group_fund')
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  const balance = totalInflow - totalOutflow;

  // Breakdown by member contribution
  const memberContributions = contributions.reduce((acc, c) => {
    acc[c.user_id] = (acc[c.user_id] || 0) + (parseFloat(c.amount) || 0);
    return acc;
  }, {});

  return {
    balance,
    totalInflow,
    totalOutflow,
    memberContributions
  };
};
