import React from 'react';
import { Users, ArrowUpRight } from 'lucide-react';

export default function GroupSpendingWidget({ impactPercent, groupShare, currencySymbol = '₹' }) {
  const fmt = (v) => `${currencySymbol}${new Intl.NumberFormat('en-IN').format(v)}`;

  return (
    <div className="glass p-6 rounded-3xl border border-white/5 h-full relative overflow-hidden group">
      {/* Background Glow */}
      <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary/10 blur-2xl rounded-full transition-all group-hover:scale-150" />
      
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-primary/10 rounded-2xl text-primary">
          <Users size={20} />
        </div>
        <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full uppercase tracking-wider">
          <ArrowUpRight size={10} />
          Group Sync
        </div>
      </div>

      <h3 className="text-sm font-bold text-muted uppercase tracking-wider mb-1">My Group Spending</h3>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-black text-text">{fmt(groupShare)}</span>
        <span className="text-xs font-medium text-muted">this month</span>
      </div>

      <div className="mt-6 space-y-2">
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted">
          <span>Personal Impact</span>
          <span>{impactPercent.toFixed(1)}%</span>
        </div>
        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full transition-all duration-1000 ease-out" 
            style={{ width: `${Math.min(impactPercent, 100)}%` }}
          />
        </div>
        <p className="text-[10px] text-muted italic leading-relaxed mt-2">
          {impactPercent > 30 
            ? "Group expenses are a significant portion of your budget." 
            : "Group spending is well within balanced limits."}
        </p>
      </div>
    </div>
  );
}
