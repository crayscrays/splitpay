import { HashRouter, Route, Routes } from "react-router-dom";
import { SplitPayProvider } from "./lib/splitpay-context";
import { Dashboard } from "./pages/Dashboard";
import { GroupDetail } from "./pages/GroupDetail";
import { AddExpense } from "./pages/AddExpense";
import { ExpenseDetail } from "./pages/ExpenseDetail";
import { SettleUp } from "./pages/SettleUp";
import { BottomNav } from "./components/BottomNav";
import { GroupsPage } from "./pages/GroupsPage";
import { WalletPage } from "./pages/WalletPage";

export default function App() {
  return (
    <SplitPayProvider>
      <HashRouter>
        <div className="h-[100dvh] w-full flex flex-col items-center bg-bg overflow-hidden">
          <div className="w-full max-w-[480px] h-full flex flex-col bg-bg border-x border-border/60 overflow-hidden relative">
            <main className="flex-1 min-h-0 flex flex-col">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/groups" element={<GroupsPage />} />
                <Route path="/wallet" element={<WalletPage />} />
                <Route path="/group/:groupId" element={<GroupDetail />} />
                <Route path="/group/:groupId/add" element={<AddExpense />} />
                <Route
                  path="/group/:groupId/expense/:expenseId"
                  element={<ExpenseDetail />}
                />
                <Route path="/group/:groupId/settle" element={<SettleUp />} />
                <Route path="*" element={<Dashboard />} />
              </Routes>
            </main>
            <BottomNav />
          </div>
        </div>
      </HashRouter>
    </SplitPayProvider>
  );
}
