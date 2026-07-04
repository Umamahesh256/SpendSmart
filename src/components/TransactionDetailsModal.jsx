import { X, TrendingDown, DollarSign, Calendar, User, FileText, CreditCard, Activity, Tag } from 'lucide-react';

export default function TransactionDetailsModal({ isOpen, onClose, item, memberProfiles }) {
  if (!isOpen || !item) return null;

  const isExpense = 'payment_source' in item;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="glass w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-scale-up border border-white/10 relative">
        
        {/* Header Background */}
        <div className={`absolute top-0 left-0 right-0 h-32 opacity-20 ${isExpense ? 'bg-gradient-to-b from-red-500 to-transparent' : 'bg-gradient-to-b from-emerald-500 to-transparent'}`} />

        <div className="relative p-6">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-muted transition-colors z-10"
          >
            <X size={16} />
          </button>

          <div className="text-center mt-2 mb-6">
            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3 shadow-lg ${isExpense ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
              {isExpense ? <TrendingDown size={28} /> : <DollarSign size={28} />}
            </div>
            
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">
              {isExpense ? 'Group Expense' : 'Fund Contribution'}
            </p>
            <h2 className={`text-4xl font-black tracking-tighter ${isExpense ? 'text-text' : 'text-emerald-400'}`}>
              {isExpense ? '-' : '+'}₹{parseFloat(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h2>
          </div>

          <div className="space-y-3">
            {/* Category / Note */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="p-2 bg-white/5 rounded-xl text-muted">
                <Tag size={16} />
              </div>
              <div>
                <p className="text-[10px] text-muted font-bold uppercase tracking-wider mb-0.5">
                  {isExpense ? 'Category & Description' : 'Note'}
                </p>
                <p className="text-sm font-semibold">
                  {isExpense 
                    ? (item.description ? `${item.category} - ${item.description}` : item.category) 
                    : (item.note || 'No description provided')}
                </p>
              </div>
            </div>

            {/* Paid By */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
                <User size={16} />
              </div>
              <div>
                <p className="text-[10px] text-muted font-bold uppercase tracking-wider mb-0.5">
                  {isExpense ? 'Paid By' : 'Added By'}
                </p>
                <p className="text-sm font-semibold">
                  {isExpense 
                    ? (memberProfiles[item.paid_by_member_id] || 'Unknown Member') 
                    : (memberProfiles[item.member_id] || memberProfiles[item.created_by] || 'Unknown Member')}
                </p>
              </div>
            </div>

            {/* Date */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400">
                <Calendar size={16} />
              </div>
              <div>
                <p className="text-[10px] text-muted font-bold uppercase tracking-wider mb-0.5">Date Recorded</p>
                <p className="text-sm font-semibold">
                  {new Date(item.date).toLocaleDateString('en-IN', { 
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                  })}
                </p>
              </div>
            </div>

            {/* Expense Specific Details */}
            {isExpense && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                  <p className="text-[10px] text-muted font-bold uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                    <CreditCard size={12} /> Source
                  </p>
                  <span className={`text-[10px] px-2 py-1 rounded-lg font-bold uppercase tracking-wider ${item.payment_source === 'group_fund' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    {item.payment_source === 'group_fund' ? 'Pool Expense' : 'Personal Pay'}
                  </span>
                </div>
                
                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                  <p className="text-[10px] text-muted font-bold uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                    <Activity size={12} /> Splitting
                  </p>
                  <span className={`text-[10px] px-2 py-1 rounded-lg font-bold uppercase tracking-wider ${item.is_split ? 'bg-violet-500/20 text-violet-400' : 'bg-surface text-muted border border-white/10'}`}>
                    {item.is_split ? 'Shared Split' : 'No Split'}
                  </span>
                </div>
              </div>
            )}
            
            {/* Contribution Specific Details */}
            {!isExpense && item.member_due_id && (
              <div className="p-3 rounded-2xl bg-blue-500/5 border border-blue-500/20">
                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                  <FileText size={12} /> Member Due Payment
                </p>
                <p className="text-xs font-semibold text-muted">
                  This payment was recorded towards an outstanding member due.
                </p>
              </div>
            )}
          </div>
          
          <button 
            onClick={onClose}
            className="w-full mt-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold transition-colors text-sm"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
