import {
  BadgePercent,
  CreditCard,
  DatabaseBackup,
  FolderOpen,
  Link2,
  ListPlus,
  MonitorSmartphone,
  Percent,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
} from "lucide-react";
import { useState } from "react";
import { AddOnsSection } from "./settings/AddOnsSection";
import { AdjustmentsSection } from "./settings/AdjustmentsSection";
import { CategoriesSection } from "./settings/CategoriesSection";
import { CollapsibleSection } from "./settings/CollapsibleSection";
import { DiscountsSection } from "./settings/DiscountsSection";
import { DeviceSyncSection } from "./settings/DeviceSyncSection";
import { ItemsSection } from "./settings/ItemsSection";
import { ModifiersSection } from "./settings/ModifiersSection";
import { PaymentOptionsSection } from "./settings/PaymentOptionsSection";
import { SettingsTransferSection } from "./settings/SettingsTransferSection";
import { ShopSection } from "./settings/ShopSection";
import { VatSection } from "./settings/VatSection";

type ExpandedSections = {
  shop: boolean;
  device: boolean;
  transfer: boolean;
  categories: boolean;
  items: boolean;
  addOns: boolean;
  modifiers: boolean;
  adjustments: boolean;
  discounts: boolean;
  vat: boolean;
  payments: boolean;
};

export function SettingsPage() {
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>({
    shop: false,
    device: false,
    transfer: false,
    categories: false,
    items: false,
    addOns: false,
    modifiers: false,
    adjustments: false,
    discounts: false,
    vat: false,
    payments: false,
  });

  function toggleSection(section: keyof ExpandedSections) {
    setExpandedSections((current) => ({ ...current, [section]: !current[section] }));
  }

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-4 px-3 py-3 sm:px-4 sm:py-4 xl:grid-cols-[1fr_1fr]">
      <div className="space-y-4">
        <CollapsibleSection
          icon={<ShoppingBag size={21} />}
          isOpen={expandedSections.shop}
          title="Shop"
          onToggle={() => toggleSection("shop")}
        >
          <ShopSection />
        </CollapsibleSection>

        <CollapsibleSection
          icon={<MonitorSmartphone size={21} />}
          isOpen={expandedSections.device}
          title="Device & Sync"
          onToggle={() => toggleSection("device")}
        >
          <DeviceSyncSection />
        </CollapsibleSection>

        <CollapsibleSection
          icon={<DatabaseBackup size={21} />}
          isOpen={expandedSections.transfer}
          title="Settings Backup"
          onToggle={() => toggleSection("transfer")}
        >
          <SettingsTransferSection />
        </CollapsibleSection>

        <CollapsibleSection
          icon={<FolderOpen size={21} />}
          isOpen={expandedSections.categories}
          title="Categories"
          onToggle={() => toggleSection("categories")}
        >
          <CategoriesSection />
        </CollapsibleSection>

        <CollapsibleSection
          icon={<ShoppingCart size={21} />}
          isOpen={expandedSections.items}
          title="Items"
          onToggle={() => toggleSection("items")}
        >
          <ItemsSection />
        </CollapsibleSection>

        <CollapsibleSection
          icon={<ListPlus size={21} />}
          isOpen={expandedSections.modifiers}
          title="Modifiers"
          onToggle={() => toggleSection("modifiers")}
        >
          <ModifiersSection />
        </CollapsibleSection>

        <CollapsibleSection
          icon={<Link2 size={21} />}
          isOpen={expandedSections.addOns}
          title="Add-ons"
          onToggle={() => toggleSection("addOns")}
        >
          <AddOnsSection />
        </CollapsibleSection>
      </div>

      <div className="space-y-4">
        <CollapsibleSection
          icon={<SlidersHorizontal size={21} />}
          isOpen={expandedSections.adjustments}
          title="Adjustments"
          onToggle={() => toggleSection("adjustments")}
        >
          <AdjustmentsSection />
        </CollapsibleSection>

        <CollapsibleSection
          icon={<BadgePercent size={21} />}
          isOpen={expandedSections.discounts}
          title="Discounts"
          onToggle={() => toggleSection("discounts")}
        >
          <DiscountsSection />
        </CollapsibleSection>

        <CollapsibleSection
          icon={<Percent size={21} />}
          isOpen={expandedSections.vat}
          title="Inclusive VAT"
          onToggle={() => toggleSection("vat")}
        >
          <VatSection />
        </CollapsibleSection>

        <CollapsibleSection
          icon={<CreditCard size={21} />}
          isOpen={expandedSections.payments}
          title="Payment Options"
          onToggle={() => toggleSection("payments")}
        >
          <PaymentOptionsSection />
        </CollapsibleSection>
      </div>
    </section>
  );
}
