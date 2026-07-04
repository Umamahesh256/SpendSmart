import { Plus, CheckCircle2, Clock, AlertCircle, FileText, Check, Calendar, Activity } from 'lucide-react';

export default function GroupDuesPanel({ dues, isManager, onCreateDue, fmt }) {
  if (!dues) return null;

  const totalOutstanding = dues
    .filter(d => d.status !== 'Paid')
    .reduce((sum, d) => sum + parseFloat(d.remaining_amount || 0), 0);

  return (
    <div className="glass p-5 rounded-3xl bg-white/[0.02] border border-white/5 animate-slide-up" style={{ animationDelay: '0.1s' }}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-muted uppercase tracking-wider">Outstanding Group Bills</h3>
        {isManager && (
          <button 
            onClick={onCreateDue}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 text-primary hover:bg-primary/30 rounded-lg text-xs font-bold transition-colors"
          >
            <Plus size={14} /> Create Due
          </button>
        )}
      </div>

      <div className="mb-5 pb-5 border-b border-white/5 flex justify-between items-end">
        <div>
          <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Total Outstanding</p>
          <h2 className="text-2xl font-black tracking-tight text-red-400">{fmt(totalOutstanding)}</h2>
        </div>
      </div>

      {dues.length === 0 ? (
        <div className="text-center py-6">
          <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2 opacity-50" />
          <p className="text-sm font-bold text-muted">No group bills found for this month.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dues.map(due => {
            const isPaid = due.status === 'Paid';
            const isPartial = due.status === 'Partially Paid';
            
            return (
              <div key={due.id} className={`p-4 rounded-2xl border transition-colors ${isPaid ? 'bg-white/[0.01] border-white/5 opacity-60' : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.05]'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl mt-0.5 ${isPaid ? 'bg-emerald-500/10 text-emerald-400' : isPartial ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>
                      {isPaid ? <Check size={16} /> : <FileText size={16} />}
                    </div>
                    <div>
                      <h4 className={`font-bold text-sm ${isPaid ? 'line-through text-muted' : 'text-text'}`}>
                        {due.category_name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 text-[10px] text-muted font-bold uppercase">
                          <Activity size={10} /> {due.type}
                        </span>
                        {due.priority !== 'Normal' && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1 font-bold ${due.priority === 'Critical' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                            {due.priority}
                          </span>
                        )}
                        {due.due_date && !isPaid && (
                          <span className="flex items-center gap-1 text-[10px] text-red-400/80 font-bold">
                            <Calendar size={10} /> Due: {new Date(due.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm font-black tracking-tight">
                      {isPaid ? fmt(due.amount) : fmt(due.remaining_amount)}
                    </div>
                    {isPartial && (
                      <div className="text-[9px] text-muted font-bold mt-0.5">
                        of {fmt(due.amount)} total
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Bar */}
                <div className="mt-3 flex items-center justify-between">
                   <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1.5 ${
                    isPaid ? 'bg-emerald-500/10 text-emerald-400' : 
                    isPartial ? 'bg-amber-500/10 text-amber-400' : 
                    'bg-red-500/10 text-red-400'
                  }`}>
                    {isPaid ? <CheckCircle2 size={10} /> : isPartial ? <Clock size={10} /> : <AlertCircle size={10} />}
                    {due.status}
                  </span>
                  
                  {isPaid && (
                    <span className="text-[10px] text-muted italic font-bold">Settled</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
