import type { Settings } from "../types";

export type VatBreakdown = {
  vatEnabled: boolean;
  vatPercentage: number;
  vatInclusive: boolean;
  vatableSales: number;
  vatAmount: number;
};

export const defaultVatSettings = {
  vatEnabled: true,
  vatPercentage: 12,
  vatInclusive: true,
};

export function calculateInclusiveVat(totalAmount: number, settings: Settings): VatBreakdown {
  const vatEnabled = settings.vatEnabled;
  const vatPercentage = Math.max(0, settings.vatPercentage);
  const vatInclusive = true;

  if (!vatEnabled || vatPercentage <= 0 || totalAmount <= 0) {
    return {
      vatEnabled,
      vatPercentage,
      vatInclusive,
      vatableSales: 0,
      vatAmount: 0,
    };
  }

  const vatableSales = Math.round(totalAmount / (1 + vatPercentage / 100));

  return {
    vatEnabled,
    vatPercentage,
    vatInclusive,
    vatableSales,
    vatAmount: totalAmount - vatableSales,
  };
}
