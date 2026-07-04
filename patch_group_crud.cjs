const fs = require('fs');

let code = fs.readFileSync('c:/SpendSmart/src/pages/GroupRoom.jsx', 'utf8');

// 1. Add DeleteConfirmModal import
if (!code.includes('DeleteConfirmModal')) {
  code = code.replace(
    "import { useParams, useNavigate } from 'react-router-dom';",
    "import { useParams, useNavigate } from 'react-router-dom';\nimport DeleteConfirmModal from '../components/DeleteConfirmModal';"
  );
}

// 2. Add State Variables
const stateHookTarget = "const [showUpdateBalanceModal, setShowUpdateBalanceModal] = useState(false);";
if (code.includes(stateHookTarget) && !code.includes('deleteConfirmId')) {
  code = code.replace(
    stateHookTarget,
    `${stateHookTarget}\n  const [deleteConfirmId, setDeleteConfirmId] = useState(null);\n  const [deleteConfirmType, setDeleteConfirmType] = useState(null);\n  const [isDeleting, setIsDeleting] = useState(false);\n  const [editExpenseId, setEditExpenseId] = useState(null);`
  );
}

// 3. Replace handleDeleteContribution (if it matches the typical pattern)
code = code.replace(
  /const handleDeleteContribution = async \(id\) => \{[\s\S]*?\n  \};\n/g,
  `const handleDeleteContribution = (id) => {\n    setDeleteConfirmType('contribution');\n    setDeleteConfirmId(id);\n  };\n`
);

// 4. Replace handleDeleteExpense
code = code.replace(
  /const handleDeleteExpense = async \(id\) => \{[\s\S]*?\n  \};\n/g,
  `const handleDeleteExpense = (id) => {\n    setDeleteConfirmType('expense');\n    setDeleteConfirmId(id);\n  };\n`
);

// 5. Replace handleAddExpense and add handleEditExpense & confirmDelete
const addExpenseMatch = code.match(/const handleAddExpense = async \(e\) => \{[\s\S]*?toast\.error\(err\.message\); \} finally \{ setFormLoading\(false\); \}\n\s*\};/);

if (addExpenseMatch) {
  const replacement = `const handleAddExpense = async (e) => {
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
  code = code.replace(addExpenseMatch[0], replacement);
}

// 6. Inject DeleteConfirmModal into JSX return
const oldJSXEnd = `<UpdateBalanceModal
        isOpen={showUpdateBalanceModal}
        onClose={() => setShowUpdateBalanceModal(false)}
        groupId={groupId}
        currentBalance={group?.manual_balance}
        onUpdate={(newBal) => setGroup(prev => ({ ...prev, manual_balance: newBal }))}
      />
    </div>`;

const newJSXEnd = `<UpdateBalanceModal
        isOpen={showUpdateBalanceModal}
        onClose={() => setShowUpdateBalanceModal(false)}
        groupId={groupId}
        currentBalance={group?.manual_balance}
        onUpdate={(newBal) => setGroup(prev => ({ ...prev, manual_balance: newBal }))}
      />
      <DeleteConfirmModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
        title={deleteConfirmType === 'expense' ? 'Delete Expense?' : 'Delete Contribution?'}
        message="This action cannot be undone."
      />
    </div>`;

if (code.includes(oldJSXEnd)) {
  code = code.replace(oldJSXEnd, newJSXEnd);
} else {
    console.log("Could not find oldJSXEnd!");
}

// Wait! I need to bind Edit / Delete buttons in the UI for expenses.
// Let's find where expense actions are rendered.
// "Delete" for expenses usually has something like `onClick={() => handleDeleteExpense(exp.id)}`. We need to add Edit.
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
    // If we can't find that exact block, let's use a simpler regex for handleDeleteExpense
    const regex = /<button onClick=\{\(\) => handleDeleteExpense\(exp\.id\)\} className="p-1\.5 text-red-500 hover:bg-red-500\/10 rounded-lg transition-colors" title="Delete">\s*<Trash2 size=\{16\} \/>\s*<\/button>/g;
    code = code.replace(regex, `<button onClick={() => handleEditExpense(exp)} className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Edit"><Edit2 size={16} /></button><button onClick={() => handleDeleteExpense(exp.id)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete"><Trash2 size={16} /></button>`);
}

// Write back
fs.writeFileSync('c:/SpendSmart/src/pages/GroupRoom.jsx', code);
console.log('CRUD script completed.');
