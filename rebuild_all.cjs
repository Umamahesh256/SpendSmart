const cp = require('child_process');

const scripts = [
  'patch_group_crud.cjs',
  'update_crud.cjs',
  'fix_add_expense.cjs',
  'update_realtime.cjs',
  'inject_modal.cjs',
  'bind_expense_ui.cjs',
  'update_modal_title.cjs',
  'update_carry_forwards.cjs',
  'inject_carry_modal.cjs',
  'remove_duplicate.cjs'
];

for (const script of scripts) {
  try {
    console.log(`Running ${script}...`);
    cp.execSync(`node ${script}`, { stdio: 'inherit' });
  } catch (err) {
    console.error(`Failed on ${script}`);
    process.exit(1);
  }
}
console.log('All scripts executed successfully!');
