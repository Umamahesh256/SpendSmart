import { Wallet, DollarSign, TrendingDown, ArrowUpCircle, ArrowDownCircle, PiggyBank, CreditCard, PenLine } from 'lucide-react';

/**
 * GroupFinanceSummary — Shows Budget, Fund Pool, and Personal Payments for a month
 */
export default function GroupFinanceSummary({ budgetStats, poolStats, personalPayments, memberProfiles, fmt, manualBalance, isManager, onUpdateBalance }) {
  return (
    <div className="space-y-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
      
      {/* ── Monthly Budget Card ───────────────────────────── */}
      {budgetStats && (
        <div className="glass p-5 rounded-3xl bg-white/[0.02] border border-white/5">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-violet-500/20 rounded-lg text-violet-400">
                <PiggyBank size={18} />
              </div>
              <p className="text-[10px] text-violet-400 font-bold uppercase tracking-widest">Monthly Budget</p>
            </div>
            <span className="text-2xl font-black">{fmt(budgetStats.budgetAmount)}</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-white/5 rounded-full h-2.5 mb-3 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-700 ${
                budgetStats.percentUsed > 90 ? 'bg-red-500' : 
                budgetStats.percentUsed > 70 ? 'bg-amber-500' : 'bg-primary'
              }`}
              style={{ width: `${Math.min(budgetStats.percentUsed, 100)}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-[9px] text-muted uppercase tracking-wider font-bold">From Pool</p>
              <p className="text-sm font-bold text-orange-400 mt-0.5">{fmt(budgetStats.spentFromPool)}</p>
            </div>
            <div>
              <p className="text-[9px] text-muted uppercase tracking-wider font-bold">Personal</p>
              <p className="text-sm font-bold text-blue-400 mt-0.5">{fmt(budgetStats.spentPersonally)}</p>
            </div>
            <div>
              <p className="text-[9px] text-muted uppercase tracking-wider font-bold">Remaining</p>
              <p className={`text-sm font-bold mt-0.5 ${budgetStats.remaining >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {fmt(budgetStats.remaining)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Actual Group Balance Card ──────────────────────── */}
      <div className="glass p-5 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-transparent border border-emerald-500/20 shadow-xl shadow-emerald-500/5">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
              <DollarSign size={18} />
            </div>
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Actual Room Balance</p>
          </div>
          <span className="text-3xl font-black text-emerald-400">{fmt(manualBalance || 0)}</span>
        </div>
        
        {isManager && (
          <div className="pt-3 border-t border-white/5 flex justify-end">
            <button 
              onClick={onUpdateBalance}
              className="flex items-center gap-1.5 text-xs font-bold bg-white/5 hover:bg-white/10 text-text px-3 py-1.5 rounded-lg transition-colors"
            >
              <PenLine size={12} /> Update Balance
            </button>
          </div>
        )}
      </div>

      {/* ── Fund Pool Card (Ledger Calculated) ────────────── */}
      <div className="glass p-5 rounded-3xl bg-white/[0.02] border border-white/5">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/20 rounded-lg text-primary">
              <Wallet size={18} />
            </div>
            <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Fund Pool</p>
          </div>
          <span className="text-2xl font-black">{fmt(poolStats.balance)}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/5">
          <div className="flex flex-col">
            <span className="text-[9px] text-muted font-bold uppercase tracking-wider flex items-center gap-1">
              <ArrowUpCircle size={9} className="text-emerald-400" /> Collected
            </span>
            <span className="text-sm font-bold mt-0.5">{fmt(poolStats.totalInflow)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-muted font-bold uppercase tracking-wider flex items-center gap-1">
              <ArrowDownCircle size={9} className="text-red-400" /> Spent
            </span>
            <span className="text-sm font-bold mt-0.5">{fmt(poolStats.totalOutflow)}</span>
          </div>
        </div>
      </div>

      {/* ── Personal Payments Card ────────────────────────── */}
      {personalPayments && personalPayments.total > 0 && (
        <div className="glass p-5 rounded-3xl bg-white/[0.02] border border-blue-500/20">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                <CreditCard size={18} />
              </div>
              <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Personal Payments</p>
            </div>
            <span className="text-lg font-black">{fmt(personalPayments.total)}</span>
          </div>

          <div className="space-y-2 pt-3 border-t border-white/5">
            {Object.entries(personalPayments.byMember).map(([memberId, amount]) => (
              <div key={memberId} className="flex justify-between items-center text-sm">
                <span className="text-muted">{memberProfiles[memberId] || 'Member'}</span>
                <span className="font-bold text-blue-400">{fmt(amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
