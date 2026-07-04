const fs = require('fs');
let code = fs.readFileSync('c:/SpendSmart/src/pages/GroupRoom.jsx', 'utf8');

const target = `  // ── Real-time expense updates ─────────────────────────────
  useEffect(() => {
    const chExp = supabase.channel(\`grp-exp-\${groupId}\`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'group_expenses', filter: \`group_id=eq.\${groupId}\` },
        () => fetchGroupData())
      .subscribe();

    const chCont = supabase.channel(\`grp-cont-\${groupId}\`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'group_contributions', filter: \`group_id=eq.\${groupId}\` },
        () => fetchGroupData())
      .subscribe();

    return () => {
      supabase.removeChannel(chExp);
      supabase.removeChannel(chCont);
    };
  }, [groupId, fetchGroupData]);`;

const replacement = `  // ── Real-time expense updates ─────────────────────────────
  useEffect(() => {
    const ch = supabase.channel(\`grp-room-\${groupId}\`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_expenses', filter: \`group_id=eq.\${groupId}\` }, () => fetchGroupData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_contributions', filter: \`group_id=eq.\${groupId}\` }, () => fetchGroupData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members', filter: \`group_id=eq.\${groupId}\` }, () => fetchGroupData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'groups', filter: \`id=eq.\${groupId}\` }, () => fetchGroupData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_budgets', filter: \`group_id=eq.\${groupId}\` }, () => fetchGroupData())
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [groupId, fetchGroupData]);`;

if (code.includes(target)) {
  fs.writeFileSync('c:/SpendSmart/src/pages/GroupRoom.jsx', code.replace(target, replacement));
  console.log('Successfully replaced Realtime block.');
} else {
  console.log('Target string not found in GroupRoom.jsx. Check exact spacing.');
}
