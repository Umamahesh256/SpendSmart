const fs = require('fs');
let code = fs.readFileSync('c:/SpendSmart/src/pages/GroupRoom.jsx', 'utf8');

// 1. Add state for carry forwards
const stateTarget = `  const [memberBalances, setMemberBalances] = useState([]);`;
if (code.includes(stateTarget) && !code.includes('carryForwards')) {
  code = code.replace(
    stateTarget,
    `${stateTarget}\n  const [carryForwards, setCarryForwards] = useState([]);`
  );
}

// 2. Fetch carry forwards in fetchGroupData
const fetchTarget = `const { data: mbData } = await supabase
        .from('member_budgets').select('*')
        .eq('group_id', groupId);
      const allMBs = mbData || [];
      setAllMemberBudgets(allMBs);`;

if (code.includes(fetchTarget) && !code.includes('budget_carry_forwards')) {
  code = code.replace(
    fetchTarget,
    `${fetchTarget}\n\n      const { data: cfData } = await supabase\n        .from('budget_carry_forwards').select('*')\n        .eq('group_id', groupId);\n      const allCFs = cfData || [];\n      setCarryForwards(allCFs);`
  );
}

// 3. Update calculateMemberBalances call
const calcTarget = `const mBalances = calculateMemberBalances(mems || [], contributionsList, thisMonthMemberBudgets, expensesList, currentMonth, currentYear);`;
if (code.includes(calcTarget) && code.includes('allCFs')) {
  code = code.replace(
    calcTarget,
    `const mBalances = calculateMemberBalances(mems || [], contributionsList, thisMonthMemberBudgets, expensesList, allCFs, currentMonth, currentYear);`
  );
}

// 4. Update Realtime subscription
const subTarget = `.on('postgres_changes', { event: '*', schema: 'public', table: 'group_budgets', filter: \`group_id=eq.\${groupId}\` }, () => fetchGroupData())`;
if (code.includes(subTarget) && !code.includes('budget_carry_forwards')) {
  code = code.replace(
    subTarget,
    `${subTarget}\n      .on('postgres_changes', { event: '*', schema: 'public', table: 'budget_carry_forwards', filter: \`group_id=eq.\${groupId}\` }, () => fetchGroupData())`
  );
}

fs.writeFileSync('c:/SpendSmart/src/pages/GroupRoom.jsx', code);
console.log('GroupRoom updated for Carry Forwards');
