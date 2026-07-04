import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Wallet, CreditCard, Users, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { calculateMonthlyPoolStats, calculateGroupBudgetStats, calculatePersonalPayments, calculateMemberBalances } from '../lib/groupLedger';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * BudgetHistory — Browse previous months' financial data
 */
export default function BudgetHistory({ allBudgets, allContributions, allExpenses, allMemberBudgets, members, memberProfiles, fmt, carryForwards = [] }) {
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [viewYear, setViewYear] = useState(now.getFullYear());

  const goBack = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  
  const goForward = () => {
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    // Prevent navigating into future months
    if (viewYear > currentYear || (viewYear === currentYear && viewMonth >= currentMonth)) {
      return;
    }

    if (viewMonth === 12) { setViewMonth(1); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const isCurrent = viewMonth === (now.getMonth() + 1) && viewYear === now.getFullYear();

  // Compute stats for the selected month
  const budget = allBudgets.find(b => b.month === viewMonth && b.year === viewYear);
  const budgetStats = calculateGroupBudgetStats(allExpenses, budget, viewMonth, viewYear);
  const poolStats = calculateMonthlyPoolStats(allContributions, allExpenses, viewMonth, viewYear);
  const personalPayments = calculatePersonalPayments(allExpenses, viewMonth, viewYear);
  
  const budgetMemberBudgets = allMemberBudgets.filter(mb => mb.group_budget_id === budget?.id);
  const memberBalances = calculateMemberBalances(members, allContributions, budgetMemberBudgets, allExpenses, carryForwards, viewMonth, viewYear);

  const STATUS_COLORS = {
    settled: 'text-emerald-400 bg-emerald-500/10',
    pending: 'text-amber-400 bg-amber-500/10',
    overpaid: 'text-blue-400 bg-blue-500/10',
    outstanding: 'text-red-400 bg-red-500/10',
    no_target: 'text-zinc-400 bg-zinc-500/10',
  };

  return (
    <div className="glass rounded-3xl bg-white/[0.02] border border-white/5 overflow-hidden animate-slide-up" style={{ animationDelay: '0.2s' }}>
      {/* Month Navigator */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/[0.02]">
        <button onClick={goBack} className="p-2 rounded-xl hover:bg-white/5 text-muted transition-colors">
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-primary" />
          <span className="text-sm font-bold">
            {MONTHS[viewMonth - 1]} {viewYear}
          </span>
          {isCurrent && (
            <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">CURRENT</span>
          )}
        </div>
        <button onClick={goForward} className="p-2 rounded-xl hover:bg-white/5 text-muted transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Budget Summary */}
        {budgetStats ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-violet-400 font-bold uppercase tracking-widest">Monthly Budget</span>
              <span className="text-lg font-black">{fmt(budgetStats.budgetAmount)}</span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${
                  budgetStats.percentUsed > 90 ? 'bg-red-500' : budgetStats.percentUsed > 70 ? 'bg-amber-500' : 'bg-primary'
                }`}
                style={{ width: `${Math.min(budgetStats.percentUsed, 100)}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[8px] text-muted uppercase tracking-wider font-bold">Total Spent</p>
                <p className="text-xs font-bold mt-0.5">{fmt(budgetStats.totalSpent)}</p>
              </div>
              <div>
                <p className="text-[8px] text-muted uppercase tracking-wider font-bold">Pool</p>
                <p className="text-xs font-bold text-orange-400 mt-0.5">{fmt(budgetStats.spentFromPool)}</p>
              </div>
              <div>
                <p className="text-[8px] text-muted uppercase tracking-wider font-bold">Personal</p>
                <p className="text-xs font-bold text-blue-400 mt-0.5">{fmt(budgetStats.spentPersonally)}</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted italic text-center py-3">No budget set for this month</p>
        )}

        <div className="h-px bg-white/5" />

        {/* Fund Pool for this month */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={14} className="text-primary" />
            <span className="text-[10px] text-primary font-bold uppercase tracking-widest">Fund Pool</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[8px] text-muted uppercase tracking-wider font-bold flex items-center justify-center gap-0.5"><ArrowUpCircle size={8} className="text-emerald-400" /> Collected</p>
              <p className="text-xs font-bold mt-0.5">{fmt(poolStats.totalInflow)}</p>
            </div>
            <div>
              <p className="text-[8px] text-muted uppercase tracking-wider font-bold flex items-center justify-center gap-0.5"><ArrowDownCircle size={8} className="text-red-400" /> Spent</p>
              <p className="text-xs font-bold mt-0.5">{fmt(poolStats.totalOutflow)}</p>
            </div>
            <div>
              <p className="text-[8px] text-emerald-400 uppercase tracking-wider font-bold">Balance</p>
              <p className="text-xs font-bold text-emerald-400 mt-0.5">{fmt(poolStats.balance)}</p>
            </div>
          </div>
        </div>

        {/* Personal Payments for this month */}
        {personalPayments.total > 0 && (
          <>
            <div className="h-px bg-white/5" />
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CreditCard size={14} className="text-blue-400" />
                  <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Personal Payments</span>
                </div>
                <span className="text-xs font-bold text-blue-400">{fmt(personalPayments.total)}</span>
              </div>
              {Object.entries(personalPayments.byMember).map(([mid, amt]) => (
                <div key={mid} className="flex justify-between text-xs">
                  <span className="text-muted">{memberProfiles[mid] || 'Member'}</span>
                  <span className="font-bold text-blue-400">{fmt(amt)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Member Statuses for this month */}
        {memberBalances.some(b => b.target > 0) && (
          <>
            <div className="h-px bg-white/5" />
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Users size={14} className="text-muted" />
                <span className="text-[10px] text-muted font-bold uppercase tracking-widest">Member Statuses</span>
              </div>
              {memberBalances.map(bal => {
                const name = memberProfiles[bal.memberId] || 'Member';
                const colors = STATUS_COLORS[bal.status] || STATUS_COLORS.no_target;
                return (
                  <div key={bal.memberId} className="flex items-center justify-between text-xs">
                    <span className="text-muted">{name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{fmt(bal.paid)} / {fmt(bal.target)}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold capitalize ${colors}`}>
                        {bal.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
