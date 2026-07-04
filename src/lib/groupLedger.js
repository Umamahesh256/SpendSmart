import { z } from 'zod';

// Schema for adding a contribution (Received Funds)
export const contributionSchema = z.object({
  member_id: z.string().uuid({ message: "Please select a valid member" }),
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
    acc[c.member_id] = (acc[c.member_id] || 0) + (parseFloat(c.amount) || 0);
    return acc;
  }, {});

  return {
    balance,
    totalInflow,
    totalOutflow,
    memberContributions
  };
};

/**
 * Calculates monthly pool stats (filtered to a specific month/year)
 * @param {Array} contributions 
 * @param {Array} expenses 
 * @param {number} month (1-12)
 * @param {number} year
 */
export const calculateMonthlyPoolStats = (contributions = [], expenses = [], month, year) => {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  
  const monthContributions = contributions.filter(c => (c.date || '').startsWith(prefix));
  const monthExpenses = expenses.filter(e => (e.date || '').startsWith(prefix));
  
  return calculatePoolStats(monthContributions, monthExpenses);
};

/**
 * Calculates personal payments breakdown for a given month
 * @param {Array} expenses
 * @param {number} month (1-12) 
 * @param {number} year
 * @returns {{ byMember: Object, total: number }}
 */
export const calculatePersonalPayments = (expenses = [], month, year) => {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  
  const personalExpenses = expenses.filter(
    e => e.payment_source === 'personal_pocket' && (e.date || '').startsWith(prefix)
  );

  const byMember = personalExpenses.reduce((acc, e) => {
    const mid = e.paid_by_member_id;
    acc[mid] = (acc[mid] || 0) + (parseFloat(e.amount) || 0);
    return acc;
  }, {});

  const total = personalExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  return { byMember, total };
};

/**
 * Calculates group budget stats for a given month
 * @param {Array} expenses
 * @param {Object|null} groupBudget - { budget_amount }
 * @param {number} month (1-12)
 * @param {number} year
 */
export const calculateGroupBudgetStats = (expenses = [], groupBudget, month, year) => {
  if (!groupBudget) return null;

  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const monthExpenses = expenses.filter(e => (e.date || '').startsWith(prefix));
  
  const budgetAmount = parseFloat(groupBudget.budget_amount) || 0;
  
  const spentFromPool = monthExpenses
    .filter(e => e.payment_source === 'group_fund')
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  
  const spentPersonally = monthExpenses
    .filter(e => e.payment_source === 'personal_pocket')
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  const totalSpent = spentFromPool + spentPersonally;
  const remaining = budgetAmount - totalSpent;
  const percentUsed = budgetAmount > 0 ? Math.min((totalSpent / budgetAmount) * 100, 100) : 0;

  return {
    budgetAmount,
    spentFromPool,
    spentPersonally,
    totalSpent,
    remaining,
    percentUsed
  };
};

/**
 * Calculates per-member balance status
 * @param {Array} members - group_members rows
 * @param {Array} contributions - group_contributions rows
 * @param {Array} memberBudgets - member_budgets rows for current month
 * @param {Array} expenses - group_expenses rows
 * @param {Array} carryForwards - budget_carry_forwards rows
 * @param {number} month (1-12)
 * @param {number} year
 * @returns {Array<{ memberId, target, paid, pending, overpaid, personalSpending, status }>}
 */
export const calculateMemberBalances = (members = [], contributions = [], memberBudgets = [], expenses = [], carryForwards = [], month, year) => {
  if (typeof carryForwards === 'number') {
    year = month;
    month = carryForwards;
    carryForwards = [];
  }
  if (!Array.isArray(carryForwards)) carryForwards = [];
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  
  // Filter contributions and expenses to the target month
  const monthContributions = contributions.filter(c => (c.date || '').startsWith(prefix));
  const monthExpenses = expenses.filter(e => (e.date || '').startsWith(prefix));

  return members.map(m => {
    // Find this member's budget target
    const mb = memberBudgets.find(b => b.member_id === m.id);
    const target = mb ? parseFloat(mb.target_amount) || 0 : 0;

    // Sum their contributions for the month (or use manual_paid override if set)
    let paid = 0;
    if (mb && mb.manual_paid != null) {
      paid = parseFloat(mb.manual_paid) || 0;
    } else {
      paid = monthContributions
        .filter(c => c.member_id === m.id)
        .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
        
      // Add incoming carry forwards only if not manually overridden
      const incomingCF = carryForwards
        .filter(cf => cf.member_id === m.id && cf.to_month === month && cf.to_year === year && cf.status === 'active')
        .reduce((sum, cf) => sum + (parseFloat(cf.original_amount) || 0), 0);
      paid += incomingCF;
    }

    // Deduct outgoing carry forwards
    const outgoingCF = carryForwards
      .filter(cf => cf.member_id === m.id && cf.from_month === month && cf.from_year === year && cf.status === 'active')
      .reduce((sum, cf) => sum + (parseFloat(cf.original_amount) || 0), 0);

    // Sum their personal spending for the month
    const personalSpending = monthExpenses
      .filter(e => e.paid_by_member_id === m.id && e.payment_source === 'personal_pocket')
      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

    let diff = paid - target;
    // Deduct the carry forward from the surplus difference
    if (diff > 0) {
      diff -= outgoingCF;
    }

    const pending = diff < 0 ? Math.abs(diff) : 0;
    const overpaid = diff > 0 ? diff : 0;

    // Status determination
    let status;
    if (target === 0 && paid === 0) {
      status = 'no_target'; // No budget set
    } else if (paid >= target && target > 0) {
      status = overpaid > 0 ? 'overpaid' : 'settled';
    } else if (paid > 0) {
      status = 'pending';
    } else {
      status = 'outstanding';
    }

    return {
      memberId: m.id,
      target,
      paid,
      pending,
      overpaid,
      personalSpending,
      status
    };
  });
};
