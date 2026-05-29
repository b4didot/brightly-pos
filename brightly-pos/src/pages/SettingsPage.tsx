import { CreditCard, FolderOpen, Percent, ShoppingCart, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { AdjustmentsSection } from "./settings/AdjustmentsSection";
import { CategoriesSection } from "./settings/CategoriesSection";
import { CollapsibleSection } from "./settings/CollapsibleSection";
import { ItemsSection } from "./settings/ItemsSection";
import { PaymentOptionsSection } from "./settings/PaymentOptionsSection";
import { VatSection } from "./settings/VatSection";

type ExpandedSections = {
  categories: boolean;
  items: boolean;
  adjustments: boolean;
  vat: boolean;
  payments: boolean;
};

export function SettingsPage() {
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>({
    categories: true,
    items: true,
    adjustments: false,
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
