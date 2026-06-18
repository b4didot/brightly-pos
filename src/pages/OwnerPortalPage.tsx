import { KeyRound, LogOut, Plus, QrCode, Store, UserRound } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  createRegistrationToken,
  getOwnerSession,
  isTokenExpired,
  listRegistrationTokens,
  loginOwner,
  logoutOwner,
  registerOwner,
  restoreOwnerSession,
  type OwnerSession,
  type RegistrationToken,
} from "../services/ownerPortal";
import { formatDateTime } from "../utils/dates";

type OwnerPortalMode = "owner-register" | "owner-login" | "dashboard";

export function OwnerPortalPage({ initialMode }: { initialMode: OwnerPortalMode }) {
  const [session, setSession] = useState<OwnerSession | null>(() => getOwnerSession());
  const [mode, setMode] = useState<OwnerPortalMode>(() => (initialMode === "dashboard" && !getOwnerSession() ? "owner-login" : initialMode));

  useEffect(() => {
    let cancelled = false;

    void restoreOwnerSession()
      .then((restoredSession) => {
        if (cancelled || !restoredSession) return;
        setSession(restoredSession);
        setMode("dashboard");
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (mode === "dashboard" && session) {
    return <OwnerDashboard session={session} onLogout={() => {
      void logoutOwner();
      setSession(null);
      setMode("owner-login");
      window.history.pushState(null, "", "/dashboard");
    }} />;
  }

  if (mode === "owner-register") {
    return <OwnerRegisterForm onComplete={(nextSession) => {
      setSession(nextSession);
      setMode("dashboard");
      window.history.pushState(null, "", "/dashboard");
    }} onSwitchToLogin={() => {
      setMode("owner-login");
      window.history.pushState(null, "", "/dashboard");
    }} />;
  }

  return <OwnerLoginForm onComplete={(nextSession) => {
    setSession(nextSession);
    setMode("dashboard");
    window.history.pushState(null, "", "/dashboard");
  }} onSwitchToRegister={() => {
    setMode("owner-register");
    window.history.pushState(null, "", "/owner/register");
  }} />;
}

function OwnerRegisterForm({ onComplete, onSwitchToLogin }: { onComplete: (session: OwnerSession) => void; onSwitchToLogin: () => void }) {
  const [ownerName, setOwnerName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      onComplete(await registerOwner({ ownerName, businessName, email, password }));
    } catch (registrationError) {
      setError(registrationError instanceof Error ? registrationError.message : "Could not create owner account.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <OwnerAuthLayout title="Create owner account" eyebrow="Brightly Owner Portal">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <TextInput label="Owner name" value={ownerName} onChange={setOwnerName} />
        <TextInput label="Business name" value={businessName} onChange={setBusinessName} />
        <TextInput label="Email" value={email} type="email" onChange={setEmail} />
        <TextInput label="Password" value={password} type="password" onChange={setPassword} />
        {error && <ErrorMessage message={error} />}
        <button type="submit" disabled={submitting} className="min-h-12 w-full rounded-lg bg-stone-950 px-4 font-bold text-white disabled:bg-stone-300">
          {submitting ? "Registering..." : "Register"}
        </button>
      </form>
      <button type="button" onClick={onSwitchToLogin} className="mt-4 w-full text-sm font-bold text-stone-700 underline">
        Log in to an existing owner account
      </button>
    </OwnerAuthLayout>
  );
}

function OwnerLoginForm({ onComplete, onSwitchToRegister }: { onComplete: (session: OwnerSession) => void; onSwitchToRegister: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      onComplete(await loginOwner(email, password));
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Could not log in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <OwnerAuthLayout title="Owner login" eyebrow="Brightly Owner Portal">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <TextInput label="Email" value={email} type="email" onChange={setEmail} />
        <TextInput label="Password" value={password} type="password" onChange={setPassword} />
        {error && <ErrorMessage message={error} />}
        <button type="submit" disabled={submitting} className="min-h-12 w-full rounded-lg bg-stone-950 px-4 font-bold text-white disabled:bg-stone-300">
          {submitting ? "Logging in..." : "Log In"}
        </button>
      </form>
      <button type="button" onClick={onSwitchToRegister} className="mt-4 w-full text-sm font-bold text-stone-700 underline">
        Create an owner account
      </button>
    </OwnerAuthLayout>
  );
}

function OwnerDashboard({ session, onLogout }: { session: OwnerSession; onLogout: () => void }) {
  const [deviceName, setDeviceName] = useState("");
  const [tokens, setTokens] = useState<RegistrationToken[]>([]);
  const [tokenError, setTokenError] = useState("");
  const [loadingTokens, setLoadingTokens] = useState(true);
  const [creatingToken, setCreatingToken] = useState(false);
  const activeTokens = useMemo(
    () => tokens.filter((token) => token.status === "active" && !isTokenExpired(token)),
    [tokens],
  );

  useEffect(() => {
    void listRegistrationTokens(session)
      .then(setTokens)
      .catch((error: unknown) => setTokenError(error instanceof Error ? error.message : "Could not load device tokens."))
      .finally(() => setLoadingTokens(false));
  }, [session]);

  async function handleCreateToken() {
    setTokenError("");
    setCreatingToken(true);

    try {
      const token = await createRegistrationToken(session, deviceName);
      setDeviceName("");
      setTokens([token, ...tokens]);
    } catch (error) {
      setTokenError(error instanceof Error ? error.message : "Could not generate device token.");
    } finally {
      setCreatingToken(false);
    }
  }

  return (
    <main className="public-scroll-page bg-[#f7f4ef] px-4 py-5 text-stone-950">
      <section className="mx-auto w-full max-w-5xl space-y-4">
        <header className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">Owner Dashboard</p>
            <h1 className="text-2xl font-bold">{session.businessName}</h1>
            <p className="text-sm text-stone-600">{session.ownerName} / {session.email}</p>
          </div>
          <div className="flex gap-2">
            <a href="/pos" className="grid min-h-11 place-items-center rounded-lg border border-stone-300 px-4 text-sm font-bold">
              POS
            </a>
            <button type="button" onClick={onLogout} className="flex min-h-11 items-center gap-2 rounded-lg bg-stone-950 px-4 text-sm font-bold text-white">
              <LogOut size={17} />
              Log Out
            </button>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-amber-50 text-amber-800">
                <Store size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold">Shop</h2>
                <p className="text-sm text-stone-600">Shop code 01</p>
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-stone-50 p-3 text-sm text-stone-700">
              Reporting, devices, sync status, and settings snapshots will attach to this shop as the cloud API is connected.
            </div>
          </section>

          <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-amber-50 text-amber-800">
                <KeyRound size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold">Add Device</h2>
                <p className="text-sm text-stone-600">{activeTokens.length} active token{activeTokens.length === 1 ? "" : "s"}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                value={deviceName}
                onChange={(event) => setDeviceName(event.target.value)}
                placeholder="Device name"
                className="min-h-11 flex-1 rounded-lg border border-stone-300 px-3 outline-none focus:border-amber-700"
              />
              <button
                type="button"
                onClick={() => void handleCreateToken()}
                disabled={creatingToken}
                className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-stone-950 px-4 font-bold text-white disabled:bg-stone-300"
              >
                <Plus size={18} />
                {creatingToken ? "Generating..." : "Add Device"}
              </button>
            </div>

            <p className="mt-3 rounded-lg bg-stone-50 p-3 text-sm text-stone-600">
              Open this address on your device and use the token below to activate it.
            </p>

            <div className="mt-4 space-y-2">
              {tokenError && <ErrorMessage message={tokenError} />}
              {loadingTokens ? (
                <p className="rounded-lg bg-stone-50 p-3 text-sm text-stone-600">Loading device tokens...</p>
              ) : tokens.length === 0 ? (
                <p className="rounded-lg bg-stone-50 p-3 text-sm text-stone-600">No device tokens generated yet.</p>
              ) : (
                tokens.map((token) => (
                  <div key={token.token} className="rounded-lg border border-stone-200 p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Token</p>
                          <p className="font-mono text-lg font-bold">{token.token}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Setup URL</p>
                          <p className="break-all font-mono text-sm text-stone-700">{createDeviceSetupUrl(token.token)}</p>
                        </div>
                        <p className="text-sm text-stone-600">{token.deviceName} / Device {token.deviceCode}</p>
                      </div>
                      <div className="flex flex-row items-center gap-3 sm:flex-col sm:items-end">
                        <SetupQrCode value={createDeviceSetupUrl(token.token)} />
                        <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold uppercase ${token.status === "active" && !isTokenExpired(token) ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-600"}`}>
                          {token.status === "active" && isTokenExpired(token) ? "expired" : token.status}
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-stone-500">
                      Created {formatDateTime(token.createdAt)} / Expires {formatDateTime(token.expiresAt ?? createLegacyTokenExpiry(token.createdAt))}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function SetupQrCode({ value }: { value: string }) {
  const [dataUrl, setDataUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    void QRCode.toDataURL(value, { margin: 1, width: 132, color: { dark: "#1c1917", light: "#ffffff" } })
      .then((nextDataUrl) => {
        if (!cancelled) setDataUrl(nextDataUrl);
      })
      .catch(() => {
        if (!cancelled) setDataUrl("");
      });

    return () => {
      cancelled = true;
    };
  }, [value]);

  if (!dataUrl) {
    return (
      <div className="grid h-[132px] w-[132px] place-items-center rounded-lg border border-stone-200 bg-stone-50 text-stone-500">
        <QrCode size={28} />
      </div>
    );
  }

  return <img src={dataUrl} alt="Device setup QR code" className="h-[132px] w-[132px] rounded-lg border border-stone-200 bg-white p-2" />;
}

function createDeviceSetupUrl(token: string) {
  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  const setupUrl = `${baseUrl.replace(/\/dashboard\/?$/, "")}/device/setup`;
  return `${setupUrl}?t=${encodeURIComponent(token)}`;
}

function createLegacyTokenExpiry(createdAt: string) {
  const expiresAt = new Date(createdAt);
  expiresAt.setDate(expiresAt.getDate() + 30);
  return expiresAt.toISOString();
}

function OwnerAuthLayout({ children, eyebrow, title }: { children: ReactNode; eyebrow: string; title: string }) {
  return (
    <main className="public-scroll-page grid place-items-center bg-[#f7f4ef] px-4 py-8 text-stone-950">
      <section className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-amber-50 text-amber-800">
            <UserRound size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">{eyebrow}</p>
            <h1 className="text-xl font-bold">{title}</h1>
          </div>
        </div>
        <div className="mt-5">{children}</div>
      </section>
    </main>
  );
}

function TextInput({
  label,
  onChange,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-stone-800">{label}</span>
      <input
        value={value}
        type={type}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-12 w-full rounded-lg border border-stone-300 px-3 text-base outline-none focus:border-amber-700"
      />
    </label>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{message}</p>;
}
