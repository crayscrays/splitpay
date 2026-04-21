import { useState } from "react";
import { AlertCircle, ArrowRightLeft, Receipt, Users, Wallet } from "lucide-react";
import { useSplitPay } from "@/lib/splitpay-context";

export function ConnectWallet() {
  const sp = useSplitPay();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  const handleConnect = async () => {
    setError("");
    setConnecting(true);
    try {
      await sp.connectWallet();
    } catch (e: any) {
      setError(e.message ?? "Failed to connect wallet.");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-20 w-20 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center">
            <span className="text-accent font-bold text-4xl">$</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">SplitPay</h1>
            <p className="text-sm text-text-muted mt-1.5 max-w-xs">
              Split bills with friends. Settle instantly with USDC on Base.
            </p>
          </div>
        </div>

        {/* Feature bullets */}
        <div className="w-full space-y-2.5">
          {[
            { icon: Users, text: "Create a group and invite anyone via link" },
            { icon: Receipt, text: "Add expenses and split them any way you like" },
            { icon: ArrowRightLeft, text: "Settle debts with real USDC — no middleman" },
          ].map(({ icon: Icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface border border-border"
            >
              <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Icon size={15} className="text-accent" />
              </div>
              <span className="text-sm text-text-muted">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Connect section */}
      <div className="px-6 pb-8 pt-4 space-y-3">
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="btn btn-primary w-full py-3.5 text-sm font-semibold"
          data-testid="button-connect"
        >
          <Wallet size={16} />
          {connecting ? "Connecting…" : "Connect Wallet"}
        </button>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-negative/10 border border-negative/30 text-xs text-negative">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <p className="text-center text-xs text-text-dim leading-relaxed">
          Works with MetaMask, Coinbase Wallet, and any injected EVM wallet.
          <br />
          Running inside 0xChat? Your wallet connects automatically.
        </p>
      </div>
    </div>
  );
}
