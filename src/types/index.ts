export type PaymentMethod = "cash" | "card";

export type OrderType = "dine-in" | "take-out";

export type AdjustmentType = "percentage" | "flat";

export type DiscountType = "percentage" | "flat";

export type ViewName = "order" | "tickets" | "settings" | "report";

export type RegistrationStatus = "unregistered" | "registered";

export type DeviceRegistration = {
  id: "main";
  registrationStatus: RegistrationStatus;
  ownerId: string | null;
  ownerName: string | null;
  businessName: string | null;
  shopId: string | null;
  shopCode: string | null;
  deviceId: string | null;
  deviceCode: string | null;
  deviceName: string | null;
  credentialId: string | null;
  credentialSecret: string | null;
  registeredAt: string | null;
  lastSeenAt: string | null;
};

export type SyncStatus = "idle" | "syncing" | "offline" | "error";

export type SyncState = {
  id: "main";
  status: SyncStatus;
  lastSuccessfulSyncAt: string | null;
  lastFailedSyncAt: string | null;
  lastError: string | null;
};

export type SyncEventType =
  | "transaction.created"
  | "transaction.served"
  | "transaction.voided"
  | "settings.snapshot";

export type SyncOutboxEntry = {
  id: string;
  eventType: SyncEventType;
  recordId: string;
  payload: unknown;
  status: "pending" | "synced" | "failed";
  attempts: number;
  createdAt: string;
  updatedAt: string;
  lastError: string | null;
  syncedAt: string | null;
};

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
  isOutOfStock: boolean;
  isAddOn: boolean;
  createdAt: string;
};

// A size/variant of an item with its own price (replaces item base price)
export type ItemVariant = {
  id: string;
  itemId: string;
  name: string;
  price: number;
  sortOrder: number;
  createdAt: string;
};

// A named modifier with a fixed set of selectable options (no price impact)
export type Modifier = {
  id: string;
  label: string;
  options: string[];
  createdAt: string;
};

// Links a modifier to an item (many-to-many)
export type ItemModifier = {
  id: string;
  itemId: string;
  modifierId: string;
};

// Links an item to another item that can be selected as a paid add-on
export type ItemAddOn = {
  id: string;
  itemId: string;
  addOnItemId: string;
};

// A selected modifier on a cart line or transaction item
export type SelectedModifier = {
  modifierId: string;
  label: string;
  selectedOption: string;
};

export type SelectedAddOn = {
  itemId: string;
  name: string;
  price: number;
};

export type Adjustment = {
  id: string;
  label: string;
  type: AdjustmentType;
  value: number;
  enabled: boolean;
  createdAt: string;
};

export type DiscountTemplate = {
  id: string;
  label: string;
  type: DiscountType;
  value: number;
  createdAt: string;
};

export type Settings = {
  id: "main";
  shopName: string;
  primaryColor: string;
  secondaryColor: string;
  cashEnabled: boolean;
  cardEnabled: boolean;
  vatEnabled: boolean;
  vatPercentage: number;
  vatInclusive: boolean;
  discountEnabled: boolean;
};

export type CartLine = {
  id: string;
  itemId: string;
  quantity: number;
  variantId: string | null;
  variantName: string | null;
  variantPrice: number | null;
  selectedModifiers: SelectedModifier[];
  selectedAddOns: SelectedAddOn[];
};

export type AppliedAdjustment = {
  adjustmentId: string;
  label: string;
  type: AdjustmentType;
  value: number;
  computedAmount: number;
};

export type AppliedDiscount = {
  discountId: string | null;
  label: string;
  type: DiscountType;
  value: number;
  computedAmount: number;
};

export type Transaction = {
  id: string;
  transactionNumber: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string | null;
  shopId: string | null;
  deviceId: string | null;
  shopCodeSnapshot: string | null;
  deviceCodeSnapshot: string | null;
  userId: string | null;
  userNameSnapshot: string | null;
  orderType: OrderType;
  paymentMethod: PaymentMethod;
  referenceId: string;
  subtotal: number;
  discount: AppliedDiscount | null;
  adjustments: AppliedAdjustment[];
  paymentAmount: number;
  changeAmount: number;
  totalAmount: number;
  vatEnabled: boolean;
  vatPercentage: number;
  vatInclusive: boolean;
  vatableSales: number;
  vatAmount: number;
  isServed: boolean;
  isVoided: boolean;
  voidReason: string | null;
  voidedAt: string | null;
};

export type TransactionItem = {
  id: string;
  transactionId: string;
  itemId: string;
  itemNameSnapshot: string;
  itemPriceSnapshot: number;
  categoryIdSnapshot: string | null;
  categoryNameSnapshot: string;
  variantId: string | null;
  variantNameSnapshot: string | null;
  variantPriceSnapshot: number | null;
  selectedModifiers: SelectedModifier[];
  selectedAddOns: SelectedAddOn[];
  quantity: number;
  lineTotal: number;
};

export type CartTotals = {
  subtotal: number;
  appliedDiscount: AppliedDiscount | null;
  discountTotal: number;
  appliedAdjustments: AppliedAdjustment[];
  adjustmentsTotal: number;
  total: number;
};
