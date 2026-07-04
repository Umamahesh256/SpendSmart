const fs = require('fs');
let code = fs.readFileSync('c:/SpendSmart/src/pages/GroupRoom.jsx', 'utf8');

const regex = /  const handleAddExpense = async \(e\) => \{[\s\S]*?toast\.error\(err\.message\);\s*\} finally \{\s*setFormLoading\(false\);\s*\}\s*\};/;
const match = code.match(regex);

if (match) {
  const newFunc = `  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!user) return;
    setFormLoading(true);
    setFieldErrors({});
    try {
      const { data: member } = await supabase.from('group_members').select('id').eq('group_id', groupId).eq('user_id', user.id).single();
      const memberId = member?.id;
      const expenseData = {
        group_id: groupId,
        amount: parseFloat(amount),
        description: desc,
        category: cat,
        date: date,
        payment_source: paymentSource,
        created_by: user.id,
        paid_by_member_id: memberId,
        is_split: false
      };
      
      if (editExpenseId) {
        const { error } = await supabase.from('group_expenses').update(expenseData).eq('id', editExpenseId);
        if (error) throw error;
        toast.success('Expense updated!');
      } else {
        const { error } = await supabase.from('group_expenses').insert([expenseData]);
        if (error) throw error;
        toast.success('Expense added!');
      }
      
      setShowAddExpense(false);
      setEditExpenseId(null);
      setAmount(''); setDesc(''); setCat('Food'); setDate(new Date().toISOString().split('T')[0]);
      fetchGroupData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditExpense = (expense) => {
    setEditExpenseId(expense.id);
    setAmount(expense.amount);
    setDesc(expense.description);
    setCat(expense.category);
    setDate(expense.date);
    setPaymentSource(expense.payment_source);
    setShowAddExpense(true);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    try {
      if (deleteConfirmType === 'expense') {
        const { error } = await supabase.from('group_expenses').delete().eq('id', deleteConfirmId);
        if (error) throw error;
        toast.success('Expense deleted');
      } else if (deleteConfirmType === 'contribution') {
        const { error } = await supabase.from('group_contributions').delete().eq('id', deleteConfirmId);
        if (error) throw error;
        toast.success('Contribution deleted');
      }
      fetchGroupData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsDeleting(false);
      setDeleteConfirmId(null);
    }
  };`;

  code = code.replace(regex, newFunc);
  
  // Replace delete functions
  code = code.replace(
    /const handleDeleteExpense = async \(id\) => \{[\s\S]*?\n  \};/g,
    `const handleDeleteExpense = (id) => { setDeleteConfirmType('expense'); setDeleteConfirmId(id); };`
  );
  code = code.replace(
    /const handleDeleteContribution = async \(id\) => \{[\s\S]*?\n  \};/g,
    `const handleDeleteContribution = (id) => { setDeleteConfirmType('contribution'); setDeleteConfirmId(id); };`
  );

  // Bind the UI
  const expenseActionsTarget = `<button onClick={() => handleDeleteExpense(exp.id)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete">
                            <Trash2 size={16} />
                          </button>`;
  const expenseActionsReplacement = `<button onClick={() => handleEditExpense(exp)} className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Edit">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDeleteExpense(exp.id)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete">
                            <Trash2 size={16} />
                          </button>`;
                          
  if (code.includes(expenseActionsTarget)) {
    code = code.replace(new RegExp(expenseActionsTarget.replace(/[.*+?^$\\{\\}()|[\\]\\\\]/g, '\\\\$&'), 'g'), expenseActionsReplacement);
  } else {
    // try looser regex
    const uiRegex = /<button onClick=\{\(\) => handleDeleteExpense\(exp\.id\)\} className="p-1\.5 text-red-500 hover:bg-red-500\/10 rounded-lg transition-colors" title="Delete">\s*<Trash2 size=\{16\} \/>\s*<\/button>/g;
    code = code.replace(uiRegex, expenseActionsReplacement);
  }

  fs.writeFileSync('c:/SpendSmart/src/pages/GroupRoom.jsx', code);
  console.log('Success!');
} else {
  console.log('Could not find oldFunc via regex');
}
