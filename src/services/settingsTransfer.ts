import { db } from "../db/database";
import type {
  Adjustment,
  Category,
  DiscountTemplate,
  Item,
  ItemAddOn,
  ItemModifier,
  ItemVariant,
  Modifier,
  Settings,
} from "../types";

export type SettingsExportPayload = {
  format: "brightly-settings";
  version: 1;
  exportedAt: string;
  syncOrigin?: "pos" | "push";
  settingsChange?: {
    changedAt: string | null;
    origin: "pos" | "push" | null;
  };
  source: {
    ownerId: string | null;
    shopId: string | null;
    deviceId: string | null;
  };
  data: {
    settings: Settings;
    categories: Category[];
    items: Item[];
    itemVariants: ItemVariant[];
    modifiers: Modifier[];
    itemModifiers: ItemModifier[];
    itemAddOns: ItemAddOn[];
    adjustments: Adjustment[];
    discountTemplates: DiscountTemplate[];
  };
};

export async function createSettingsExport(syncOrigin: "pos" | "push" = "pos"): Promise<SettingsExportPayload> {
  const [
    settings,
    deviceRegistration,
    categories,
    items,
    itemVariants,
    modifiers,
    itemModifiers,
    itemAddOns,
    adjustments,
    discountTemplates,
  ] = await Promise.all([
    db.settings.get("main"),
    db.deviceRegistration.get("main"),
    db.categories.toArray(),
    db.items.toArray(),
    db.itemVariants.toArray(),
    db.modifiers.toArray(),
    db.itemModifiers.toArray(),
    db.itemAddOns.toArray(),
    db.adjustments.toArray(),
    db.discountTemplates.toArray(),
  ]);

  if (!settings) {
    throw new Error("Settings are not available for export.");
  }

  return {
    format: "brightly-settings",
    version: 1,
    exportedAt: new Date().toISOString(),
    syncOrigin,
    settingsChange: {
      changedAt: settings.settingsUpdatedAt,
      origin: settings.settingsChangeOrigin,
    },
    source: {
      ownerId: deviceRegistration?.ownerId ?? null,
      shopId: deviceRegistration?.shopId ?? null,
      deviceId: deviceRegistration?.deviceId ?? null,
    },
    data: {
      settings,
      categories,
      items,
      itemVariants,
      modifiers,
      itemModifiers,
      itemAddOns,
      adjustments,
      discountTemplates,
    },
  };
}

export async function importSettingsExport(payload: unknown) {
  const settingsExport = validateSettingsExport(payload);
  const data = settingsExport.data;

  await db.transaction(
    "rw",
    [
      db.settings,
      db.categories,
      db.items,
      db.itemVariants,
      db.modifiers,
      db.itemModifiers,
      db.itemAddOns,
      db.adjustments,
      db.discountTemplates,
    ],
    async () => {
      await Promise.all([
        db.categories.clear(),
        db.items.clear(),
        db.itemVariants.clear(),
        db.modifiers.clear(),
        db.itemModifiers.clear(),
        db.itemAddOns.clear(),
        db.adjustments.clear(),
        db.discountTemplates.clear(),
      ]);

      await db.settings.put({ ...data.settings, id: "main" });
      await db.categories.bulkPut(data.categories);
      await db.items.bulkPut(data.items);
      await db.itemVariants.bulkPut(data.itemVariants);
      await db.modifiers.bulkPut(data.modifiers);
      await db.itemModifiers.bulkPut(data.itemModifiers);
      await db.itemAddOns.bulkPut(data.itemAddOns);
      await db.adjustments.bulkPut(data.adjustments);
      await db.discountTemplates.bulkPut(data.discountTemplates);
    },
  );
}

function validateSettingsExport(payload: unknown): SettingsExportPayload {
  if (!payload || typeof payload !== "object") {
    throw new Error("Settings file is not valid.");
  }

  const candidate = payload as SettingsExportPayload;
  if (candidate.format !== "brightly-settings" || candidate.version !== 1 || !candidate.data) {
    throw new Error("Settings file format is not supported.");
  }

  const data = candidate.data;
  if (
    !data.settings ||
    !Array.isArray(data.categories) ||
    !Array.isArray(data.items) ||
    !Array.isArray(data.itemVariants) ||
    !Array.isArray(data.modifiers) ||
    !Array.isArray(data.itemModifiers) ||
    !Array.isArray(data.itemAddOns) ||
    !Array.isArray(data.adjustments) ||
    !Array.isArray(data.discountTemplates)
  ) {
    throw new Error("Settings file is missing required data.");
  }

  return candidate;
}
