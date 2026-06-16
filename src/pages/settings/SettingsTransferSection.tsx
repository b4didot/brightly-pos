import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { usePosStore } from "../../store/usePosStore";

export function SettingsTransferSection() {
  const exportSettings = usePosStore((state) => state.exportSettings);
  const importSettings = usePosStore((state) => state.importSettings);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function handleExport() {
    setStatus("");
    setError("");

    try {
      await exportSettings();
      setStatus("Settings export started.");
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Could not export settings.");
    }
  }

  async function handleImport(file: File | undefined) {
    if (!file) return;

    setStatus("");
    setError("");

    if (!window.confirm("Importing settings will replace the current menu and configuration on this device. Continue?")) {
      return;
    }

    try {
      await importSettings(file);
      setStatus("Settings imported.");
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Could not import settings.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => void handleExport()}
          className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-stone-950 px-4 font-bold text-white"
        >
          <Download size={18} />
          Export Settings
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-4 font-bold text-stone-950"
        >
          <Upload size={18} />
          Import Settings
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => void handleImport(event.target.files?.[0])}
      />

      {status && <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{status}</p>}
      {error && <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
    </div>
  );
}
