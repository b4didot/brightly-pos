import type { ReactNode } from "react";

export type DashboardSection = "overview" | "reports" | "devices" | "config" | "profile" | "subscription";

export type ReportKind =
  | "transaction-report"
  | "sales-summary"
  | "sales-by-item"
  | "sales-by-category"
  | "sales-by-payment-type"
  | "discounts"
  | "vat";

export type SalesGraphMode = "net" | "gross" | "all";

export type DashboardSectionDefinition = {
  id: DashboardSection;
  label: string;
  icon: ReactNode;
};

export type OverviewTrendPoint = {
  gross: number;
  label: string;
  net: number;
};

export type OverviewBarDatum = {
  label: string;
  value: number;
};

export type OverviewAnalytics = {
  averageSale: number;
  card: number;
  cash: number;
  deviceSales: OverviewBarDatum[];
  netSales: number;
  salesTrend: OverviewTrendPoint[];
  topItems: OverviewBarDatum[];
  transactions: number;
};
