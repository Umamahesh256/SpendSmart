/**
 * Financial Systems Architect Utilities for SpendSmart
 * Handles complex settlement logic and budget impact calculations.
 */

/**
 * Calculates the settlement state for a group.
 * @param {Array} members - List of group members with profiles.
 * @param {Array} expenses - List of group expenses.
 * @returns {Object} Settlement data including individual balances and "who owes whom" logic.
 */
export function calculateSettlements(members, expenses) {
  if (!members.length) return { balances: {}, totalGroupSpending: 0, settlements: [] };

  const totalGroupSpending = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
  const memberCount = members.length;
  
  // 1. Calculate how much each member has paid
  const paidBy = {};
  members.forEach(m => paidBy[m.user_id] = 0);
  expenses.forEach(exp => {
    paidBy[exp.added_by] = (paidBy[exp.added_by] || 0) + parseFloat(exp.amount);
  });

  // 2. Calculate the "Share" each member should have paid
  // Simplified: Equal split. Advanced: use exp.split_members if exists
  const shares = {};
  members.forEach(m => shares[m.user_id] = 0);
  
  expenses.forEach(exp => {
    if (exp.is_split && exp.split_members?.length > 0) {
      const share = parseFloat(exp.amount) / exp.split_members.length;
      exp.split_members.forEach(memberId => {
        shares[memberId] = (shares[memberId] || 0) + share;
      });
    } else {
      const share = parseFloat(exp.amount) / memberCount;
      members.forEach(m => {
        shares[m.user_id] = (shares[m.user_id] || 0) + share;
      });
    }
  });

  // 3. Calculate net balance (Paid - Share)
  const balances = {};
  members.forEach(m => {
    balances[m.user_id] = paidBy[m.user_id] - shares[m.user_id];
  });

  // 4. Generate specific settlement steps (Who owes whom)
  // Logic: Match people with negative balances (debtors) to people with positive balances (creditors)
  const debtors = members
    .filter(m => balances[m.user_id] < -0.01)
    .map(m => ({ id: m.user_id, balance: Math.abs(balances[m.user_id]) }))
    .sort((a, b) => b.balance - a.balance);

  const creditors = members
    .filter(m => balances[m.user_id] > 0.01)
    .map(m => ({ id: m.user_id, balance: balances[m.user_id] }))
    .sort((a, b) => b.balance - a.balance);

  const settlements = [];
  let dIdx = 0, cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];
    const amount = Math.min(debtor.balance, creditor.balance);

    settlements.push({
      from: debtor.id,
      to: creditor.id,
      amount: amount
    });

    debtor.balance -= amount;
    creditor.balance -= amount;

    if (debtor.balance < 0.01) dIdx++;
    if (creditor.balance < 0.01) cIdx++;
  }

  return {
    balances,
    totalGroupSpending,
    settlements,
    userPaid: paidBy,
    userShare: shares
  };
}

/**
 * Calculates the net balance and personal budget impact.
 * @param {number} personalExpenses - Sum of personal expenses.
 * @param {number} groupShare - Sum of user's shares in group expenses.
 * @returns {Object} Net metrics.
 */
export function calculateNetMetrics(personalExpenses, groupShare) {
  const totalOutflow = personalExpenses + groupShare;
  const groupImpactPercent = totalOutflow > 0 ? (groupShare / totalOutflow) * 100 : 0;
  
  return {
    totalOutflow,
    groupImpactPercent
  };
}

/**
 * Groups expenses by date for heatmap/charting.
 * @param {Array} transactions - Combined transactions.
 * @returns {Array} Data for chart.
 */
export function groupSpendingByDate(transactions) {
  const map = {};
  transactions.forEach(t => {
    const date = t.date.split('T')[0];
    map[date] = (map[date] || 0) + parseFloat(t.amount);
  });

  return Object.entries(map)
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}
