import { BarChart3, Settings, ShoppingCart, Ticket, UploadCloud } from "lucide-react";
import { useState } from "react";
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
  const cart = usePosStore((state) => state.cart);
  const pendingConfigSyncRequests = usePosStore((state) => state.pendingConfigSyncRequests);
  const applyConfigSyncRequest = usePosStore((state) => state.applyConfigSyncRequest);
  const [syncError, setSyncError] = useState("");
  const [applyingRequestId, setApplyingRequestId] = useState("");
  const pendingRequest = pendingConfigSyncRequests.find((request) => request.status === "requested" || request.status === "seen");

  async function handleApplyConfigRequest(requestId: string) {
    setSyncError("");
    setApplyingRequestId(requestId);
    try {
      await applyConfigSyncRequest(requestId);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Could not apply owner settings.");
    } finally {
      setApplyingRequestId("");
    }
  }

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

      {pendingRequest ? (
        <section className="sticky top-[86px] z-10 border-b border-amber-200 bg-amber-50 px-3 py-3 text-stone-950 shadow-sm sm:top-[73px] sm:px-4">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-white text-amber-800">
                <UploadCloud size={20} />
              </div>
              <div>
                <p className="font-bold">Owner settings update is ready</p>
                <p className="text-sm text-stone-700">
                  Accept to apply the owner update now.{cart.length > 0 ? " The current order sheet will be reset." : ""}
                </p>
                {syncError ? <p className="mt-1 text-sm font-semibold text-red-700">{syncError}</p> : null}
              </div>
            </div>
            <div className="grid gap-2 sm:flex">
              <button
                type="button"
                disabled={applyingRequestId === pendingRequest.id}
                onClick={() => void handleApplyConfigRequest(pendingRequest.id)}
                className="min-h-11 rounded-lg bg-stone-950 px-4 text-sm font-bold text-white disabled:bg-stone-300"
              >
                {applyingRequestId === pendingRequest.id ? "Applying..." : "Accept"}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {activeView === "order" && <OrderPage />}
      {activeView === "tickets" && <TicketsPage />}
      {activeView === "settings" && <SettingsPage />}
      {activeView === "report" && <ReportPage />}
    </main>
  );
}
