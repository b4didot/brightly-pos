import { BarChart3, Settings, ShoppingCart, Ticket } from "lucide-react";
import { usePosStore } from "../store/usePosStore";
import { NavButton } from "./NavButton";
import { OrderPage } from "../pages/OrderPage";
import { ReportPage } from "../pages/ReportPage";
import { SettingsPage } from "../pages/SettingsPage";
import { TicketsPage } from "../pages/TicketsPage";

export function AppShell() {
  const activeView = usePosStore((state) => state.activeView);
  const setActiveView = usePosStore((state) => state.setActiveView);
  const settings = usePosStore((state) => state.settings);

  return (
    <main
      className={`app-shell app-shell-${activeView} h-dvh min-h-screen overflow-x-hidden overflow-y-auto bg-[#f7f4ef] text-stone-950`}
    >
      <header
        className="app-header sticky top-0 z-20 border-b border-stone-200 px-3 py-3 backdrop-blur sm:px-4"
        style={{ backgroundColor: settings.secondaryColor }}
      >
        <div className="flex w-full flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="app-header-title min-w-0 text-center sm:text-left">
            <p
              className="app-header-label text-xs font-semibold uppercase tracking-[0.18em]"
              style={{ color: settings.primaryColor }}
            >
              Brightly POS
            </p>
            <h1 className="truncate text-xl font-bold text-stone-950">{settings.shopName}</h1>
          </div>
          <nav className="grid grid-cols-4 gap-1 rounded-full bg-stone-100 p-1 sm:w-auto sm:gap-2">
            <NavButton
              active={activeView === "order"}
              label="Order"
              icon={<ShoppingCart size={18} />}
              onClick={() => setActiveView("order")}
            />
            <NavButton
              active={activeView === "tickets"}
              label="Tickets"
              icon={<Ticket size={20} />}
              onClick={() => setActiveView("tickets")}
            />
            <NavButton
              active={activeView === "settings"}
              label="Settings"
              icon={<Settings size={18} />}
              onClick={() => setActiveView("settings")}
            />
            <NavButton
              active={activeView === "report"}
              label="Report"
              icon={<BarChart3 size={18} />}
              onClick={() => setActiveView("report")}
            />
          </nav>
        </div>
      </header>

      {activeView === "order" && <OrderPage />}
      {activeView === "tickets" && <TicketsPage />}
      {activeView === "settings" && <SettingsPage />}
      {activeView === "report" && <ReportPage />}
    </main>
  );
}
