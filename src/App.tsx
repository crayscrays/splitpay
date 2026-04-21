import { HashRouter, Route, Routes } from "react-router-dom";
import { SplitPayProvider, useSplitPay } from "./lib/splitpay-context";
import { ConnectWallet } from "./pages/ConnectWallet";
import { Dashboard } from "./pages/Dashboard";
import { GroupDetail } from "./pages/GroupDetail";
import { AddExpense } from "./pages/AddExpense";
import { ExpenseDetail } from "./pages/ExpenseDetail";
import { SettleUp } from "./pages/SettleUp";
import { JoinGroup } from "./pages/JoinGroup";
import { BottomNav } from "./components/BottomNav";
import { GroupsPage } from "./pages/GroupsPage";
import { WalletPage } from "./pages/WalletPage";

function AppShell() {
  const sp = useSplitPay();

  // Loading — wallet check in progress
  if (sp.loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-text-muted text-sm">Loading…</div>
      </div>
    );
  }

  // Not connected — show onboarding (but let /join links through so recipients can connect first)
  if (sp.mode === "disconnected") {
    return <ConnectWallet />;
  }

  return (
    <>
      <main className="flex-1 min-h-0 flex flex-col">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/group/:groupId" element={<GroupDetail />} />
          <Route path="/group/:groupId/add" element={<AddExpense />} />
          <Route path="/group/:groupId/expense/:expenseId" element={<ExpenseDetail />} />
          <Route path="/group/:groupId/expense/:expenseId/edit" element={<AddExpense />} />
          <Route path="/group/:groupId/settle" element={<SettleUp />} />
          <Route path="/join/:inviteCode" element={<JoinGroup />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </main>
      <BottomNav />
    </>
  );
}

export default function App() {
  return (
    <SplitPayProvider>
      <HashRouter>
        <div className="h-[100dvh] w-full flex flex-col items-center bg-bg overflow-hidden">
          <div className="w-full max-w-[480px] h-full flex flex-col bg-bg border-x border-border/60 overflow-hidden relative">
            <AppShell />
          </div>
        </div>
      </HashRouter>
    </SplitPayProvider>
  );
}
