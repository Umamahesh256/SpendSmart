import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import AddTransactionModal from '../components/AddTransactionModal';
import EmptyState from '../components/EmptyState';
import { Plus, Search, Pencil, Trash2, ArrowRightLeft, TrendingDown, TrendingUp } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState('INR');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState(null);

  const [filterType, setFilterType] = useState('all');
  const [searchCategory, setSearchCategory] = useState('');

  const fetchTransactions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });
    if (data) setTransactions(data);
  };

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('currency').eq('id', user.id).single().then(({ data }) => {
      if (data?.currency) setCurrency(data.currency);
    });
    fetchTransactions();
    setLoading(false);

    const channel = supabase.channel('tx-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` }, () => {
        fetchTransactions();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this transaction?')) return;
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete transaction');
    } else {
      toast.success('Transaction deleted');
    }
  };

  const handleEdit = (tx) => {
    setTransactionToEdit(tx);
    setIsModalOpen(true);
  };

  const handleOpenNew = () => {
    setTransactionToEdit(null);
    setIsModalOpen(true);
  };

  const fmt = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);

  const filtered = transactions.filter(t => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (searchCategory && !t.category.toLowerCase().includes(searchCategory.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin text-primary"><ArrowRightLeft size={32} /></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-muted text-sm mt-0.5">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={handleOpenNew}
          className="flex items-center gap-1.5 bg-primary text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-emerald-400 transition-colors shadow-lg shadow-primary/20"
        >
          <Plus size={18} />
          Add
        </button>
      </div>

      {/* ── Filters ──────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-4 space-y-3">
        {/* Type tabs */}
        <div className="flex bg-surface p-1 rounded-xl gap-1">
          {['all', 'income', 'expense'].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg capitalize transition-all ${
                filterType === type
                  ? 'bg-primary text-white shadow'
                  : 'text-muted hover:text-text'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
          <input
            type="text"
            placeholder="Search category..."
            value={searchCategory}
            onChange={(e) => setSearchCategory(e.target.value)}
            className="w-full bg-surface border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* ── Transactions List ─────────────────────────────────── */}
      <div className="glass rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState 
            icon={ArrowRightLeft}
            title="No transactions"
            message={searchCategory ? `No results for "${searchCategory}"` : "You haven't recorded any transactions yet."}
            actionLabel={!searchCategory ? "Add First Transaction" : null}
            onAction={!searchCategory ? handleOpenNew : null}
          />
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map(tx => (
              <div
                key={tx.id}
                className="group flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors"
              >
                {/* Icon */}
                <div className={`p-2.5 rounded-xl flex-shrink-0 ${tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                  {tx.type === 'income' ? <TrendingUp size={17} /> : <TrendingDown size={17} />}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold capitalize truncate">{tx.category}</p>
                  <p className="text-xs text-muted truncate">
                    {new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    {tx.payment_method ? ` · ${tx.payment_method}` : ''}
                    {tx.note ? ` · ${tx.note}` : ''}
                  </p>
                </div>

                {/* Amount + Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-sm font-bold ${tx.type === 'income' ? 'text-emerald-500' : 'text-text'}`}>
                    {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
                  </span>
                  {/* Edit/Delete — always visible */}
                  <div className="flex gap-1 transition-opacity">
                    <button
                      onClick={() => handleEdit(tx)}
                      className="p-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors"
                      title="Edit Transaction"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(tx.id)}
                      className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
                      title="Delete Transaction"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        transactionToEdit={transactionToEdit}
      />
    </div>
  );
}
