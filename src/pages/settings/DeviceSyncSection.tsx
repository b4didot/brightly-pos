import { DatabaseZap, MonitorSmartphone } from "lucide-react";
import { useState } from "react";
import { usePosStore } from "../../store/usePosStore";
import { formatDateTime } from "../../utils/dates";

export function DeviceSyncSection() {
  const deviceRegistration = usePosStore((state) => state.deviceRegistration);
  const seedDemoOrders = usePosStore((state) => state.seedDemoOrders);
  const syncPendingOutbox = usePosStore((state) => state.syncPendingOutbox);
  const syncState = usePosStore((state) => state.syncState);
  const pendingSyncCount = usePosStore((state) => state.syncOutbox.filter((entry) => entry.status === "pending").length);
  const [seedStatus, setSeedStatus] = useState<"idle" | "seeding" | "done" | "error">("idle");
  const [seedMessage, setSeedMessage] = useState("");

  async function handleSeedOrders() {
    setSeedStatus("seeding");
    setSeedMessage("");

    try {
      const result = await seedDemoOrders();
      await syncPendingOutbox();
      setSeedStatus("done");
      setSeedMessage(
        `Seeded ${result.insertedTransactions} orders from ${result.startDate} to ${result.endDate}. Skipped ${result.skippedExistingTransactions} existing seeded orders.`,
      );
    } catch (error) {
      setSeedStatus("error");
      setSeedMessage(error instanceof Error ? error.message : "Unable to seed orders.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-amber-50 text-amber-800">
          <MonitorSmartphone size={20} />
        </div>
        <div>
          <h3 className="font-bold text-stone-950">{deviceRegistration.deviceName ?? "Registered Device"}</h3>
          <p className="text-sm text-stone-600">{deviceRegistration.businessName ?? "Brightly shop"}</p>
        </div>
      </div>

      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <InfoRow label="Owner" value={deviceRegistration.ownerName ?? "Not available"} />
        <InfoRow label="Shop Code" value={deviceRegistration.shopCode ?? "Not available"} />
        <InfoRow label="Device Code" value={deviceRegistration.deviceCode ?? "Not available"} />
        <InfoRow label="Device ID" value={deviceRegistration.deviceId ?? "Not available"} />
        <InfoRow label="Registered" value={deviceRegistration.registeredAt ? formatDateTime(deviceRegistration.registeredAt) : "Not available"} />
        <InfoRow label="Sync Status" value={syncState.status} />
        <InfoRow label="Last Sync" value={syncState.lastSuccessfulSyncAt ? formatDateTime(syncState.lastSuccessfulSyncAt) : "Not synced yet"} />
        <InfoRow label="Pending Sync" value={String(pendingSyncCount)} />
      </div>

      {syncState.lastError && (
        <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {syncState.lastError}
        </p>
      )}

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <button
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-amber-800 px-4 py-3 text-sm font-bold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={seedStatus === "seeding"}
          type="button"
          onClick={handleSeedOrders}
        >
          <DatabaseZap size={18} />
          {seedStatus === "seeding" ? "Seeding orders..." : "Seed demo orders"}
        </button>
        {seedMessage && (
          <p className={`mt-2 text-sm font-semibold ${seedStatus === "error" ? "text-red-700" : "text-amber-900"}`}>
            {seedMessage}
          </p>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-3">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-stone-500">{label}</p>
      <p className="mt-1 break-all font-semibold text-stone-950">{value}</p>
    </div>
  );
}
