import { BarChart3, Settings, ShoppingCart } from "lucide-react";
import { useEffect } from "react";
import { usePosStore } from "../store/usePosStore";
import { NavButton } from "./NavButton";
import { OrderPage } from "../pages/OrderPage";
import { ReportPage } from "../pages/ReportPage";
import { SettingsPage } from "../pages/SettingsPage";

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
    <main className="min-h-screen bg-[#f7f4ef] text-stone-950">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-[#fffaf3]/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
              Brightly POS
            </p>
            <h1 className="text-xl font-bold text-stone-950">Coffee Bar</h1>
          </div>
          <nav className="grid grid-cols-3 gap-2 rounded-full bg-stone-100 p-1">
            <NavButton
              active={activeView === "order"}
              label="Order"
              icon={<ShoppingCart size={18} />}
              onClick={() => setActiveView("order")}
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
          {activeView === "settings" && <SettingsPage />}
          {activeView === "report" && <ReportPage />}
        </>
      )}
    </main>
  );
}
