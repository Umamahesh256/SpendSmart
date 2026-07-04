const fs = require('fs');
let code = fs.readFileSync('c:/SpendSmart/src/pages/GroupRoom.jsx', 'utf8');

const target = '<UpdateBalanceModal';
if (code.includes(target) && !code.includes('<DeleteConfirmModal')) {
  code = code.replace(
    target,
    `<DeleteConfirmModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
        title={deleteConfirmType === 'expense' ? 'Delete Expense?' : 'Delete Contribution?'}
        message="This action cannot be undone."
      />\n      <UpdateBalanceModal`
  );
  fs.writeFileSync('c:/SpendSmart/src/pages/GroupRoom.jsx', code);
  console.log('Successfully injected DeleteConfirmModal');
} else {
  console.log('Could not find target or modal already exists');
}
