import { CheckCircle2, Download, KeyRound, MonitorDown, Share, Smartphone, Store } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePosStore } from "../store/usePosStore";

type DeviceType = "android" | "ios";
type InstallChoice = "accepted" | "dismissed";
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: InstallChoice; platform: string }>;
};

export function DeviceRegistrationPage() {
  const registerDevice = usePosStore((state) => state.registerDevice);
  const load = usePosStore((state) => state.load);
  const [deviceType, setDeviceType] = useState<DeviceType | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installPromptStatus, setInstallPromptStatus] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setInstallPromptStatus("");
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  async function handleInstallApp() {
    if (!installPrompt) {
      setInstallPromptStatus("If the install prompt is not available, use the browser menu and choose Add to Home screen or Install app.");
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    setInstallPromptStatus(
      choice.outcome === "accepted"
        ? "Brightly POS is being added to your home screen."
        : "Install was dismissed. You can try again from the browser menu.",
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await registerDevice(token);
      await load();
      window.location.href = "/pos";
    } catch (registrationError) {
      setError(registrationError instanceof Error ? registrationError.message : "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f4ef] px-4 py-8 text-stone-950">
      <section className="mx-auto w-full max-w-2xl rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-amber-50 text-amber-800">
            <Store size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">Brightly POS</p>
            <h1 className="text-xl font-bold">Set up this device</h1>
          </div>
        </div>

        <div className="mt-5 space-y-5">
          <section>
            <h2 className="text-base font-bold">Choose your device</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <DeviceTypeButton
                active={deviceType === "android"}
                icon={<Smartphone size={20} />}
                label="Android Phone or Tablet"
                onClick={() => setDeviceType("android")}
              />
              <DeviceTypeButton
                active={deviceType === "ios"}
                icon={<Share size={20} />}
                label="iPhone or iPad"
                onClick={() => setDeviceType("ios")}
              />
            </div>
          </section>

          {deviceType && (
            <InstallSteps
              deviceType={deviceType}
              installPromptAvailable={installPrompt !== null}
              installPromptStatus={installPromptStatus}
              onInstallApp={handleInstallApp}
            />
          )}
        </div>

        {deviceType && (
          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-bold text-stone-800">Registration token</span>
            <input
              value={token}
              onChange={(event) => setToken(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-lg border border-stone-300 px-3 text-base font-semibold uppercase outline-none focus:border-amber-700"
              placeholder="BRT-XXXX-XXXX"
              autoCapitalize="characters"
              autoComplete="one-time-code"
            />
          </label>

          {error && <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={submitting || token.trim().length === 0}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-stone-950 px-4 font-bold text-white disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            <KeyRound size={18} />
            {submitting ? "Registering..." : "Register Device"}
          </button>
          </form>
        )}

        <div className="mt-4 rounded-lg bg-stone-50 p-3 text-sm text-stone-600">
          Open this page from the QR code or setup URL shown on the owner dashboard. The token is generated there and is used only once.
        </div>
      </section>
    </main>
  );
}

function DeviceTypeButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-14 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-bold ${
        active
          ? "border-stone-950 bg-stone-950 text-white"
          : "border-stone-300 bg-white text-stone-800"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function InstallSteps({
  deviceType,
  installPromptAvailable,
  installPromptStatus,
  onInstallApp,
}: {
  deviceType: DeviceType;
  installPromptAvailable: boolean;
  installPromptStatus: string;
  onInstallApp: () => void;
}) {
  const steps = deviceType === "android"
    ? [
        "Tap Install app when the browser makes the prompt available.",
        "If no prompt appears, open the browser menu.",
        "Choose Add to Home screen or Install app.",
        "Open Brightly POS from the home screen.",
      ]
    : [
        "Open this setup page in Safari.",
        "Tap the Share button.",
        "Choose Add to Home Screen.",
        "Open Brightly POS from the home screen.",
      ];

  return (
    <section className="rounded-lg border border-stone-200 bg-stone-50 p-4">
      <div className="flex items-center gap-2">
        <MonitorDown size={19} className="text-amber-800" />
        <h2 className="text-base font-bold">Install Brightly POS</h2>
      </div>
      <ol className="mt-3 space-y-2">
        {steps.map((step) => (
          <li key={step} className="flex gap-2 text-sm text-stone-700">
            <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-700" />
            <span>{step}</span>
          </li>
        ))}
      </ol>
      {deviceType === "android" && (
        <div className="mt-4">
          <button
            type="button"
            onClick={onInstallApp}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-stone-950 px-4 text-sm font-bold text-white"
          >
            <Download size={18} />
            {installPromptAvailable ? "Install app" : "Try install prompt"}
          </button>
          {installPromptStatus && (
            <p className="mt-2 rounded-lg bg-white p-3 text-sm text-stone-600">{installPromptStatus}</p>
          )}
        </div>
      )}
    </section>
  );
}
