import { CheckCircle2, Clock, TrendingUp, AlertCircle, CreditCard } from 'lucide-react';

const STATUS_CONFIG = {
  settled:     { icon: CheckCircle2, color: 'emerald', label: 'Settled',     dot: '🟢' },
  pending:     { icon: Clock,        color: 'amber',   label: 'Pending',     dot: '🟡' },
  overpaid:    { icon: TrendingUp,   color: 'blue',    label: 'Overpaid',    dot: '🔵' },
  outstanding: { icon: AlertCircle,  color: 'red',     label: 'Outstanding', dot: '🔴' },
  no_target:   { icon: Clock,        color: 'zinc',    label: 'No Target',   dot: '⚪' },
};

/**
 * MemberBudgetPanel — Shows per-member contribution status and personal spending
 */
export default function MemberBudgetPanel({ memberBalances, members, memberProfiles, fmt }) {
  if (!memberBalances || memberBalances.length === 0) return null;

  return (
    <div className="glass p-5 rounded-3xl bg-white/[0.02] border border-white/5 animate-slide-up" style={{ animationDelay: '0.15s' }}>
      <h3 className="text-sm font-bold text-muted uppercase tracking-wider mb-4">Member Contributions</h3>
      
      <div className="space-y-3">
        {memberBalances.map(bal => {
          const member = members.find(m => m.id === bal.memberId);
          if (!member) return null;
          
          const cfg = STATUS_CONFIG[bal.status] || STATUS_CONFIG.no_target;
          const StatusIcon = cfg.icon;
          const name = memberProfiles[bal.memberId] || 'Member';
          const progressPct = bal.target > 0 ? Math.min((bal.paid / bal.target) * 100, 100) : 0;
          
          return (
            <div key={bal.memberId} className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
              {/* Header: Name + Status */}
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-surface border border-white/5 flex items-center justify-center font-bold text-sm text-primary">
                    {name[0].toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold">{name}</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 bg-${cfg.color}-500/10 text-${cfg.color}-400`}>
                  <StatusIcon size={10} /> {cfg.label}
                </span>
              </div>

              {/* Progress Bar */}
              {bal.target > 0 && (
                <div className="w-full bg-white/5 rounded-full h-1.5 mb-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 bg-${cfg.color}-500`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[8px] text-muted uppercase tracking-wider font-bold">Target</p>
                  <p className="text-xs font-bold mt-0.5">{fmt(bal.target)}</p>
                </div>
                <div>
                  <p className="text-[8px] text-muted uppercase tracking-wider font-bold">Paid</p>
                  <p className="text-xs font-bold text-emerald-400 mt-0.5">{fmt(bal.paid)}</p>
                </div>
                <div>
                  {bal.status === 'overpaid' ? (
                    <>
                      <p className="text-[8px] text-blue-400 uppercase tracking-wider font-bold">Overpaid</p>
                      <p className="text-xs font-bold text-blue-400 mt-0.5">+{fmt(bal.overpaid)}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-[8px] text-muted uppercase tracking-wider font-bold">Pending</p>
                      <p className={`text-xs font-bold mt-0.5 ${bal.pending > 0 ? 'text-amber-400' : 'text-muted'}`}>{fmt(bal.pending)}</p>
                    </>
                  )}
                </div>
              </div>

              {/* Personal Spending */}
              {bal.personalSpending > 0 && (
                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/5">
                  <CreditCard size={11} className="text-blue-400" />
                  <span className="text-[10px] text-muted">Personal Spending:</span>
                  <span className="text-[10px] font-bold text-blue-400">{fmt(bal.personalSpending)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
