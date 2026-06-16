import { useEffect, useState } from "react";
import { AppShell } from "./components/AppShell";
import { DeviceRegistrationPage } from "./pages/DeviceRegistrationPage";
import { OwnerPortalPage } from "./pages/OwnerPortalPage";
import { usePosStore } from "./store/usePosStore";

type AppRoute = "pos" | "owner-register" | "owner-login" | "dashboard" | "device-setup";

function App() {
  const route = useHashRoute();

  if (route === "owner-register" || route === "owner-login" || route === "dashboard") {
    return <OwnerPortalPage initialMode={route} />;
  }

  return <PosGate />;
}

function PosGate() {
  const loading = usePosStore((state) => state.loading);
  const loadError = usePosStore((state) => state.loadError);
  const load = usePosStore((state) => state.load);
  const resetLocalData = usePosStore((state) => state.resetLocalData);
  const registrationStatus = usePosStore((state) => state.deviceRegistration.registrationStatus);
  const syncPendingOutbox = usePosStore((state) => state.syncPendingOutbox);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f4ef] px-4 text-stone-950">
        <div className="rounded-lg border border-stone-200 bg-white px-5 py-4 shadow-sm">
          Loading local register...
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f4ef] px-4 text-stone-950">
        <div className="w-full max-w-md rounded-lg border border-red-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-700">Local Register Error</p>
          <h1 className="mt-2 text-xl font-bold text-stone-950">Unable to load saved data</h1>
          <p className="mt-2 text-sm text-stone-600">{loadError}</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => void load()} className="min-h-11 rounded-lg border border-stone-300 px-4 font-bold">
              Retry
            </button>
            <button type="button" onClick={() => void resetLocalData()} className="min-h-11 rounded-lg bg-stone-950 px-4 font-bold text-white">
              Reset Local Data
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (registrationStatus !== "registered") {
    return <DeviceRegistrationPage />;
  }

  return <RegisteredPos syncPendingOutbox={syncPendingOutbox} />;
}

function RegisteredPos({ syncPendingOutbox }: { syncPendingOutbox: () => Promise<void> }) {
  useEffect(() => {
    void syncPendingOutbox();
    const intervalId = window.setInterval(() => {
      void syncPendingOutbox();
    }, 30_000);

    return () => window.clearInterval(intervalId);
  }, [syncPendingOutbox]);

  return <AppShell />;
}

function useHashRoute(): AppRoute {
  const [hash, setHash] = useState(() => window.location.hash);

  useEffect(() => {
    function handleHashChange() {
      setHash(window.location.hash);
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  if (hash === "#/owner/register") return "owner-register";
  if (hash === "#/owner/login") return "owner-login";
  if (hash === "#/dashboard") return "dashboard";
  if (hash === "#/device/setup") return "device-setup";
  return "pos";
}

export default App;
