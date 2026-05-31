import { BarChart3, Settings, ShoppingCart, Ticket } from "lucide-react";
import { useEffect } from "react";
import { usePosStore } from "../store/usePosStore";
import { NavButton } from "./NavButton";
import { OrderPage } from "../pages/OrderPage";
import { ReportPage } from "../pages/ReportPage";
import { SettingsPage } from "../pages/SettingsPage";
import { TicketsPage } from "../pages/TicketsPage";

export function AppShell() {
  const activeView = usePosStore((state) => state.activeView);
  const setActiveView = usePosStore((state) => state.setActiveView);
  const loading = usePosStore((state) => state.loading);
  const loadError = usePosStore((state) => state.loadError);
  const load = usePosStore((state) => state.load);
  const resetLocalData = usePosStore((state) => state.resetLocalData);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className={`app-shell app-shell-${activeView} min-h-screen bg-[#f7f4ef] text-stone-950`}>
      <header className="app-header sticky top-0 z-20 border-b border-stone-200 bg-[#fffaf3]/95 px-3 py-3 backdrop-blur sm:px-4">
        <div className="flex w-full flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="app-header-title min-w-0 text-center sm:text-left">
            <p className="app-header-label text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
              Brightly POS
            </p>
            <h1 className="truncate text-xl font-bold text-stone-950">Coffee Bar</h1>
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

      {loading ? (
        <section className="grid min-h-[70vh] place-items-center">
          <div className="rounded-lg border border-stone-200 bg-white px-5 py-4 shadow-sm">
            Loading local register...
          </div>
        </section>
      ) : loadError ? (
        <section className="grid min-h-[70vh] place-items-center px-4">
          <div className="w-full max-w-md rounded-lg border border-red-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-700">
              Local Register Error
            </p>
            <h2 className="mt-2 text-xl font-bold text-stone-950">Unable to load saved data</h2>
            <p className="mt-2 text-sm text-stone-600">{loadError}</p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => void load()}
                className="min-h-11 rounded-lg border border-stone-300 px-4 font-bold"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={() => void resetLocalData()}
                className="min-h-11 rounded-lg bg-stone-950 px-4 font-bold text-white"
              >
                Reset Local Data
              </button>
            </div>
          </div>
        </section>
      ) : (
        <>
          {activeView === "order" && <OrderPage />}
          {activeView === "tickets" && <TicketsPage />}
          {activeView === "settings" && <SettingsPage />}
          {activeView === "report" && <ReportPage />}
        </>
      )}
    </main>
  );
}
