const fs = require('fs');
let code = fs.readFileSync('c:/SpendSmart/src/pages/GroupRoom.jsx', 'utf8');

const regex = /\{\(isOwn \|\| isManager\) && isExpense && \([\s\S]*?<button[\s\S]*?onClick=\{\(\) => handleDeleteExpense\(item\.id\)\}[\s\S]*?className="p-1\.5 bg-red-500\/10 hover:bg-red-500\/20 text-red-500 rounded-lg transition-all"[\s\S]*?title="Delete Expense"[\s\S]*?>[\s\S]*?<Trash2 size=\{13\} \/>[\s\S]*?<\/button>[\s\S]*?\)\}/;

const replaceVal = `{(isOwn || isManager) && isExpense && (
                          <div className="flex gap-1 transition-all">
                            <button
                              onClick={() => handleEditExpense(item)}
                              className="p-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-all"
                              title="Edit Expense"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteExpense(item.id)}
                              className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all"
                              title="Delete Expense"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}`;

if (code.match(regex)) {
  code = code.replace(regex, replaceVal);
  fs.writeFileSync('c:/SpendSmart/src/pages/GroupRoom.jsx', code);
  console.log('UI bound successfully.');
} else {
  console.log('Could not find expense delete button in UI with regex.');
}
