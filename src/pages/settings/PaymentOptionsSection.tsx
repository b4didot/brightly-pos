import { Banknote, CreditCard } from "lucide-react";
import { usePosStore } from "../../store/usePosStore";
import { ToggleRow } from "./ToggleRow";

export function PaymentOptionsSection() {
  const settings = usePosStore((state) => state.settings);
  const setPaymentMethodEnabled = usePosStore((state) => state.setPaymentMethodEnabled);

  return (
    <div className="grid gap-3">
      <ToggleRow
        checked={settings.cashEnabled}
        disabled={settings.cashEnabled && !settings.cardEnabled}
        icon={<Banknote size={20} />}
        label="Cash"
        onChange={(checked) => void setPaymentMethodEnabled("cash", checked)}
      />
      <ToggleRow
        checked={settings.cardEnabled}
        disabled={settings.cardEnabled && !settings.cashEnabled}
        icon={<CreditCard size={20} />}
        label="Card"
        onChange={(checked) => void setPaymentMethodEnabled("card", checked)}
      />
    </div>
  );
}
