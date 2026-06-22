import { useEffect, useState } from "react";
import { AppShell } from "./components/AppShell";
import { DeviceRegistrationPage } from "./pages/DeviceRegistrationPage";
import { OwnerPortalPage } from "./pages/OwnerPortalPage";
import { usePosStore } from "./store/usePosStore";
import { isInstalledPwa } from "./utils/pwa";

type AppRoute = "landing" | "pos" | "owner-register" | "owner-login" | "dashboard" | "device-setup";

function App() {
  const route = useAppRoute();

  if (route === "landing") {
    return <LandingPage />;
  }

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
  const queueSettingsSnapshotForSync = usePosStore((state) => state.queueSettingsSnapshotForSync);

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

  if (!isInstalledPwa() && !import.meta.env.DEV) {
    return <DeviceRegistrationPage />;
  }

  return <RegisteredPos queueSettingsSnapshotForSync={queueSettingsSnapshotForSync} syncPendingOutbox={syncPendingOutbox} />;
}

function RegisteredPos({
  queueSettingsSnapshotForSync,
  syncPendingOutbox,
}: {
  queueSettingsSnapshotForSync: (origin: "pos") => Promise<void>;
  syncPendingOutbox: () => Promise<void>;
}) {
  useEffect(() => {
    void queueSettingsSnapshotForSync("pos").then(() => syncPendingOutbox());
    const intervalId = window.setInterval(() => {
      void syncPendingOutbox();
    }, 30_000);
    function handleOnline() {
      void syncPendingOutbox();
    }

    window.addEventListener("online", handleOnline);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("online", handleOnline);
    };
  }, [queueSettingsSnapshotForSync, syncPendingOutbox]);

  return <AppShell />;
}

function LandingPage() {
  return (
    <main className="public-scroll-page bg-[#f7f4ef] text-stone-950">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
        <a href="/" className="text-lg font-black tracking-tight">
          Brightly POS
        </a>
        <a href="/dashboard" className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-bold">
          Log in
        </a>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-88px)] w-full max-w-6xl items-center gap-8 px-4 pb-10 lg:grid-cols-[1fr_0.9fr]">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-amber-800">Local-first POS for small shops</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
            Run your counter with a POS that keeps working.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-700">
            Brightly POS helps food and beverage shops take orders, manage tickets, export reports, and keep device data local after setup.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="/dashboard" className="grid min-h-12 place-items-center rounded-lg bg-stone-950 px-6 font-bold text-white">
              Get Started
            </a>
            <a href="/device/setup" className="grid min-h-12 place-items-center rounded-lg border border-stone-300 bg-white px-6 font-bold text-stone-900">
              Set Up Device
            </a>
          </div>
        </div>

        <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <div className="rounded-lg bg-stone-950 p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-200">Today</p>
                <h2 className="text-2xl font-black">Register</h2>
              </div>
              <p className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-black text-stone-950">Offline ready</p>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {["Iced Latte", "Matcha", "Croissant", "Americano"].map((item) => (
                <div key={item} className="rounded-lg bg-white/10 p-4">
                  <p className="font-bold">{item}</p>
                  <p className="mt-2 text-sm text-stone-300">Tap to add</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg bg-white p-4 text-stone-950">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold">Pending tickets</span>
                <span className="font-mono">04</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-stone-200">
                <div className="h-2 w-2/3 rounded-full bg-amber-600" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function useAppRoute(): AppRoute {
  const [locationKey, setLocationKey] = useState(() => createLocationKey());

  useEffect(() => {
    function handleLocationChange() {
      setLocationKey(createLocationKey());
    }

    window.addEventListener("hashchange", handleLocationChange);
    window.addEventListener("popstate", handleLocationChange);
    return () => {
      window.removeEventListener("hashchange", handleLocationChange);
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, []);

  const { hash, pathname } = locationKey;

  if (pathname === "/" && isInstalledPwa()) return "pos";
  if (pathname === "/") return "landing";
  if (pathname === "/dashboard") return "dashboard";
  if (pathname === "/owner/register" || hash === "#/owner/register") return "owner-register";
  if (pathname === "/owner/login" || hash === "#/owner/login") return "owner-login";
  if (pathname === "/device/setup" || hash === "#/device/setup") return "device-setup";
  if (pathname === "/pos") return "pos";
  if (hash === "#/dashboard") return "dashboard";
  return "pos";
}

function createLocationKey() {
  return {
    hash: window.location.hash,
    pathname: window.location.pathname,
  };
}

export default App;
