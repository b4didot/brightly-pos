export type PaymentMethod = "cash" | "card";

export type AdjustmentType = "percentage" | "flat";

export type ViewName = "order" | "settings" | "report";

export type Category = {
  id: string;
  name: string;
  defaultColor: string;
  createdAt: string;
};

export type Item = {
  id: string;
  name: string;
  price: number;
  categoryId: string | null;
  createdAt: string;
};

export type Adjustment = {
  id: string;
  label: string;
  type: AdjustmentType;
  value: number;
  enabled: boolean;
  createdAt: string;
};

export type Settings = {
  id: "main";
  cashEnabled: boolean;
  cardEnabled: boolean;
  vatEnabled: boolean;
  vatPercentage: number;
  vatInclusive: boolean;
};

export type CartLine = {
  itemId: string;
  quantity: number;
};

export type AppliedAdjustment = {
  adjustmentId: string;
  label: string;
  type: AdjustmentType;
  value: number;
  computedAmount: number;
};

export type Transaction = {
  id: string;
  transactionNumber: string;
  createdAt: string;
  paymentMethod: PaymentMethod;
  referenceId: string;
  subtotal: number;
  adjustments: AppliedAdjustment[];
  paymentAmount: number;
  changeAmount: number;
  totalAmount: number;
  vatEnabled: boolean;
  vatPercentage: number;
  vatInclusive: boolean;
  vatableSales: number;
  vatAmount: number;
};

export type TransactionItem = {
  id: string;
  transactionId: string;
  itemId: string;
  itemNameSnapshot: string;
  itemPriceSnapshot: number;
  quantity: number;
  lineTotal: number;
};

export type CartTotals = {
  subtotal: number;
  appliedAdjustments: AppliedAdjustment[];
  adjustmentsTotal: number;
  total: number;
};
