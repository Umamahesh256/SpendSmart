const fs = require('fs');
let code = fs.readFileSync('c:/SpendSmart/src/pages/GroupRoom.jsx', 'utf8');

const regex = /\/\/ ── Delete expense ────────────────────────────────────────\s*const handleDeleteExpense = async \(id\) => \{[\s\S]*?toast\.error\(err\.message\);\s*\}\s*\};\s*/;

if (code.match(regex)) {
  code = code.replace(regex, '');
  fs.writeFileSync('c:/SpendSmart/src/pages/GroupRoom.jsx', code);
  console.log('Removed duplicate handleDeleteExpense');
} else {
  console.log('Could not find duplicate using regex');
}
