import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { X } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../lib/categories';

const DEFAULT_CATEGORIES = {
  expense: EXPENSE_CATEGORIES,
  income: INCOME_CATEGORIES
};

const PAYMENT_METHODS = ['Cash', 'UPI', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Mobile Wallet', 'Other'];

export default function AddTransactionModal({ isOpen, onClose, transactionToEdit, onSaved }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES.expense[0]);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  // Reset or populate form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (transactionToEdit) {
        setType(transactionToEdit.type);
        setAmount(transactionToEdit.amount);
        setCategory(transactionToEdit.category);
        setPaymentMethod(transactionToEdit.payment_method || 'Cash');
        setDate(transactionToEdit.date);
        setNote(transactionToEdit.note || '');
      } else {
        setType('expense');
        setAmount('');
        setCategory(DEFAULT_CATEGORIES.expense[0]);
        setPaymentMethod('Cash');
        setDate(new Date().toISOString().split('T')[0]);
        setNote('');
      }
    }
  }, [isOpen, transactionToEdit]);

  // Adjust default category when type changes
  useEffect(() => {
    if (!transactionToEdit || type !== transactionToEdit.type) {
      setCategory(DEFAULT_CATEGORIES[type][0]);
    }
  }, [type, transactionToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const transactionData = {
      user_id: user.id,
      type,
      amount: parseFloat(amount),
      category,
      payment_method: paymentMethod,
      date,
      note
    };

    try {
      if (transactionToEdit) {
        const { error } = await supabase
          .from('transactions')
          .update(transactionData)
          .eq('id', transactionToEdit.id);
        if (error) throw error;
        toast.success('Transaction updated!');
      } else {
        const { error } = await supabase
          .from('transactions')
          .insert([transactionData]);
        if (error) throw error;
        toast.success('Transaction added!');
      }
      if (onSaved) onSaved(); // INSTANT UPDATE
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="glass w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        
        <div className="flex justify-between items-center p-6 border-b border-white/10">
          <h2 className="text-xl font-bold">
            {transactionToEdit ? 'Edit Transaction' : 'Add Transaction'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surface text-muted hover:text-text transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Type Toggle */}
          <div className="flex p-1 bg-surface rounded-xl">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${type === 'expense' ? 'bg-red-500 text-white shadow-md' : 'text-muted hover:text-text'}`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${type === 'income' ? 'bg-emerald-500 text-white shadow-md' : 'text-muted hover:text-text'}`}
            >
              Income
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-1">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">₹</span>
              <input 
                type="number" 
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-surface border border-white/10 rounded-xl pl-8 pr-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
            >
              {DEFAULT_CATEGORIES[type].map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Show purpose text box only when 'Other' is selected */}
            {category === 'Other' && (
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50 mt-2"
                placeholder="Specify other category… (optional)"
                maxLength={100}
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
            >
              {PAYMENT_METHODS.map(method => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-1">Date</label>
            <input 
              type="date" 
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {category !== 'Other' && (
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Note <span className="text-muted/60">(Optional)</span></label>
              <input 
                type="text" 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="What was this for?"
              />
            </div>
          )}

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-medium border border-white/10 hover:bg-surface transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 py-3 rounded-xl font-medium text-white transition-colors disabled:opacity-50 ${type === 'expense' ? 'bg-red-500 hover:bg-red-400' : 'bg-emerald-500 hover:bg-emerald-400'}`}
            >
              {loading ? 'Saving...' : 'Save Transaction'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
