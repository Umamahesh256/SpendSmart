const fs = require('fs');
let code = fs.readFileSync('c:/SpendSmart/src/pages/GroupRoom.jsx', 'utf8');

// 1. Add imports
if (!code.includes('DeleteConfirmModal')) {
  code = code.replace(
    "import { useParams, useNavigate } from 'react-router-dom';",
    "import { useParams, useNavigate } from 'react-router-dom';\nimport DeleteConfirmModal from '../components/DeleteConfirmModal';"
  );
}

// 2. Add state variables for DeleteConfirmModal and EditExpense
if (!code.includes('const [deleteConfirmId, setDeleteConfirmId]')) {
  code = code.replace(
    "const [showUpdateBalanceModal, setShowUpdateBalanceModal] = useState(false);",
    "const [showUpdateBalanceModal, setShowUpdateBalanceModal] = useState(false);\n  const [deleteConfirmId, setDeleteConfirmId] = useState(null);\n  const [deleteConfirmType, setDeleteConfirmType] = useState(null);\n  const [isDeleting, setIsDeleting] = useState(false);\n  const [editExpenseId, setEditExpenseId] = useState(null);"
  );
}

// 3. Rewrite handleDeleteContribution
code = code.replace(
  /const handleDeleteContribution = async \(id\) => \{[\s\S]*?\};\n/g,
  `const handleDeleteContribution = (id) => {
    setDeleteConfirmType('contribution');
    setDeleteConfirmId(id);
  };\n`
);

// 4. Rewrite handleDeleteExpense
code = code.replace(
  /const handleDeleteExpense = async \(id\) => \{[\s\S]*?\};\n/g,
  `const handleDeleteExpense = (id) => {
    setDeleteConfirmType('expense');
    setDeleteConfirmId(id);
  };\n`
);

// 5. Rewrite handleAddExpense to support editExpenseId
const oldHandleAddExpenseRegex = /const handleAddExpense = async \(e\) => \{[\s\S]*?fetchGroupData\(\);\n\s*\} catch \(err\) \{ toast.error\(err.message\); \} finally \{ setFormLoading\(false\); \}\n\s*\};/;

const newHandleAddExpense = `const handleAddExpense = async (e) => {
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
    } catch (err) { toast.error(err.message); } finally { setFormLoading(false); }
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

if (code.match(oldHandleAddExpenseRegex)) {
  code = code.replace(oldHandleAddExpenseRegex, newHandleAddExpense);
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

code = code.replace(oldJSXEnd, newJSXEnd);

fs.writeFileSync('c:/SpendSmart/src/pages/GroupRoom.jsx', code);
console.log('CRUD features injected.');
