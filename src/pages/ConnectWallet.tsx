import { MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";

export function ConnectWallet() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 text-center">
      <div className="h-20 w-20 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center">
        <MessageCircle size={36} className="text-accent" />
      </div>
      <div>
        <h1 className="text-xl font-bold tracking-tight">Open in 0xChat</h1>
        <p className="text-sm text-text-muted mt-2 max-w-xs leading-relaxed">
          SplitPay requires a 0xChat wallet. Open this app from within 0xChat to connect automatically.
        </p>
      </div>
      <Link
        to="/debug"
        className="text-xs text-text-dim underline underline-offset-2"
      >
        Bridge diagnostics
      </Link>
    </div>
  );
}
