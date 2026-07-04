const fs = require('fs');
let code = fs.readFileSync('c:/SpendSmart/src/pages/GroupRoom.jsx', 'utf8');

const regexH2 = /<h2 className="text-xl font-bold">Add Group Expense<\/h2>/g;
if (code.match(regexH2)) {
  code = code.replace(regexH2, '<h2 className="text-xl font-bold">{editExpenseId ? "Edit Expense" : "Add Group Expense"}</h2>');
}

const regexBtn = /\{formLoading \? 'Adding…' : 'Add Expense'\}/g;
if (code.match(regexBtn)) {
  code = code.replace(regexBtn, '{formLoading ? (editExpenseId ? "Updating…" : "Adding…") : (editExpenseId ? "Update Expense" : "Add Expense")}');
}

fs.writeFileSync('c:/SpendSmart/src/pages/GroupRoom.jsx', code);
console.log('Title updated');
