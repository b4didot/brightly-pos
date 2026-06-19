import { UserRound } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { OwnerDashboard } from "./owner-dashboard/OwnerDashboard";
import {
  getOwnerSession,
  loginOwner,
  logoutOwner,
  registerOwner,
  restoreOwnerSession,
  type OwnerSession,
} from "../services/ownerPortal";

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
    return <OwnerDashboard session={session} onSessionChange={setSession} onLogout={() => {
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

function OwnerAuthLayout({ children, eyebrow, title }: { children: ReactNode; eyebrow: string; title: string }) {
  return (
    <main className="public-scroll-page grid place-items-center bg-[#f7f4ef] px-4 py-8 text-stone-950">
      <section className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-[#DDF1F1] text-[#2F7474]">
            <UserRound size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#51A3A3]">{eyebrow}</p>
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
      <input value={value} type={type} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-stone-300 px-3 text-base outline-none focus:border-[#51A3A3]" />
    </label>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{message}</p>;
}
