import { CheckCircle2, KeyRound, Menu, MonitorDown, Share, Smartphone, Store } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { usePosStore } from "../store/usePosStore";
import { isInstalledPwa } from "../utils/pwa";

type DeviceType = "android" | "ios";

export function DeviceRegistrationPage() {
  const registerDevice = usePosStore((state) => state.registerDevice);
  const load = usePosStore((state) => state.load);
  const [deviceType, setDeviceType] = useState<DeviceType | null>(null);
  const installedPwa = isInstalledPwa();
  const urlToken = getUrlToken();
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await activateDevice(token);
  }

  async function handleEmbeddedTokenActivation() {
    await activateDevice(urlToken);
  }

  async function activateDevice(activationToken: string) {
    setError("");
    setSubmitting(true);

    try {
      await registerDevice(activationToken);
      await load();
      window.location.href = "/pos";
    } catch (registrationError) {
      setError(registrationError instanceof Error ? registrationError.message : "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="public-scroll-page bg-[#f7f4ef] px-4 py-8 text-stone-950">
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

        {!installedPwa && (
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

          {deviceType && <InstallSteps deviceType={deviceType} />}
        </div>
        )}

        {installedPwa && urlToken && (
          <div className="mt-5 space-y-4">
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-sm font-bold text-emerald-800">Activation link detected</p>
              <p className="mt-2 font-mono text-lg font-bold text-stone-950">{urlToken}</p>
              <p className="mt-2 text-sm text-emerald-900">
                Tap activate to register this installed POS device to the shop.
              </p>
            </div>

            {error && <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}

            <button
              type="button"
              onClick={() => void handleEmbeddedTokenActivation()}
              disabled={submitting}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-stone-950 px-4 font-bold text-white disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              <KeyRound size={18} />
              {submitting ? "Activating..." : "Activate Device"}
            </button>
          </div>
        )}

        {installedPwa && !urlToken && (
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
          {installedPwa
            ? urlToken
              ? "The activation token came from the setup link. It will be burned after successful activation."
              : "Enter the token from the owner dashboard to activate this installed POS device."
            : "After adding Brightly POS to your home screen, open the installed app from this same setup link to activate the device."}
        </div>
      </section>
    </main>
  );
}

function getUrlToken() {
  const token = new URLSearchParams(window.location.search).get("t");
  return token?.trim().toUpperCase() ?? "";
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

function InstallSteps({ deviceType }: { deviceType: DeviceType }) {
  const steps = deviceType === "android"
    ? [
        "Tap the three-dot browser menu.",
        "Look for Add to Home screen.",
        "Tap Install.",
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
        <div className="mt-4 flex gap-3 rounded-lg bg-white p-3 text-sm text-stone-700">
          <Menu size={18} className="mt-0.5 shrink-0 text-amber-800" />
          <p>
            Some Android browsers may label this action Install app instead of Add to Home screen.
          </p>
        </div>
      )}
    </section>
  );
}
