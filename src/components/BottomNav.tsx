import { NavLink } from "react-router-dom";
import { Home, Users, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/groups", label: "Groups", icon: Users, end: false },
  { to: "/wallet", label: "Wallet", icon: Wallet, end: false },
];

export function BottomNav() {
  return (
    <nav className="sticky bottom-0 z-10 bg-bg/95 backdrop-blur border-t border-border">
      <div className="grid grid-cols-3">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
                isActive ? "text-accent" : "text-text-muted hover:text-text"
              )
            }
            data-testid={`nav-${label.toLowerCase()}`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
