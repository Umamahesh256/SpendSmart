const fs = require('fs');
let code = fs.readFileSync('c:/SpendSmart/src/pages/GroupRoom.jsx', 'utf8');

// 1. Import
if (!code.includes('CarryForwardModal')) {
  code = code.replace(
    "import MemberBudgetPanel from '../components/MemberBudgetPanel';",
    "import MemberBudgetPanel from '../components/MemberBudgetPanel';\nimport CarryForwardModal from '../components/CarryForwardModal';"
  );
}

// 2. State
const stateTarget = `const [deleteConfirmId, setDeleteConfirmId] = useState(null);`;
if (code.includes(stateTarget) && !code.includes('carryForwardData')) {
  code = code.replace(
    stateTarget,
    `${stateTarget}\n  const [carryForwardData, setCarryForwardData] = useState(null);`
  );
}

// 3. onCarryForward prop
const memberPanelTarget = `<MemberBudgetPanel
            memberBalances={memberBalances}
            members={members}
            memberProfiles={memberProfiles}
            fmt={fmt}
          />`;
const newMemberPanel = `<MemberBudgetPanel
            memberBalances={memberBalances}
            members={members}
            memberProfiles={memberProfiles}
            fmt={fmt}
            onCarryForward={(mId, amt) => {
              const currentMonth = new Date().getMonth() + 1;
              const currentYear = new Date().getFullYear();
              setCarryForwardData({
                memberId: mId,
                memberName: memberProfiles[mId] || 'Member',
                overpaidAmount: amt,
                fromMonth: currentMonth,
                fromYear: currentYear
              });
            }}
          />`;

if (code.includes(memberPanelTarget)) {
  code = code.replace(memberPanelTarget, newMemberPanel);
}

// 4. Render modal
const renderTarget = `<UpdateBalanceModal`;
if (code.includes(renderTarget) && !code.includes('<CarryForwardModal')) {
  code = code.replace(
    renderTarget,
    `{carryForwardData && (
        <CarryForwardModal
          isOpen={true}
          onClose={() => setCarryForwardData(null)}
          groupId={groupId}
          memberId={carryForwardData.memberId}
          memberName={carryForwardData.memberName}
          overpaidAmount={carryForwardData.overpaidAmount}
          fromMonth={carryForwardData.fromMonth}
          fromYear={carryForwardData.fromYear}
          onSuccess={fetchGroupData}
        />
      )}\n      <UpdateBalanceModal`
  );
}

fs.writeFileSync('c:/SpendSmart/src/pages/GroupRoom.jsx', code);
console.log('CarryForwardModal injected');
