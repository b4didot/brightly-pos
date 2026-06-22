# Brightly POS Feature Catalog

This document lists the customer-facing features currently available in Brightly POS. It is intended as the reference for plan packaging, feature gating, and Free vs Premium decisions.

This catalog intentionally focuses on product features that a shop owner can understand and compare across plans. It does not list app plumbing such as landing pages, route guards, setup screens, session restore, or installation mechanics unless they directly affect a customer-facing plan capability.

## POS App Features

### Categories

Categories let shops organize menu items into groups such as drinks, pastries, meals, or add-ons. This makes the order screen easier to browse during live selling and helps cashiers find items quickly. Categories are also saved into transaction item snapshots so historical sales can still be reported by category even if the menu changes later.

### Dine-in / Take-out

Each order can be marked as either dine-in or take-out before checkout. The selected order type becomes part of the transaction record and appears in transaction reports. This allows shops to separate on-premise and takeaway sales when reviewing business activity.

### Item Creation

Shops can create and manage sellable menu items inside the POS settings. Each item includes a name, price, and optional category assignment. Items appear on the order screen and can be added to the cart during checkout.

### Item Variants

Variants allow a single item to have multiple price options, such as small, medium, large, hot, iced, or other alternate versions. When a cashier selects a variant during item customization, the variant name and price are saved with the cart line and later snapshotted into the completed transaction.

### Add-ons

Add-ons are paid extras that can be linked to regular menu items. Examples include extra shots, toppings, syrups, packaging, or side items. During checkout, cashiers can select available add-ons from the customization modal, and the add-on price is included in the item total.

### Modifiers

Modifiers are selectable options that describe how an item should be prepared, such as sweetness level, ice level, temperature, or preparation preference. Modifiers are grouped and linked to menu items. They currently do not add price, but the selected option is saved with the transaction for order accuracy.

### Adjustments

Adjustments are additional cart-level charges applied after discounts, such as service charge, packaging fee, or delivery fee. They can be configured as either percentage-based or fixed amount charges. Enabled adjustments are applied automatically during checkout and are included in transaction records and reports.

### Discounts

Discounts allow shops to reduce the cart total during checkout. Discount templates can be created in settings and reused by cashiers, while manual discounts can also be applied during the payment review flow. Discounts may be percentage-based or fixed amount and cannot reduce the cart total below zero.

### VAT

The POS supports inclusive VAT. Shops can enable or disable VAT, configure the VAT percentage, and automatically calculate VATable sales and VAT amount from the final transaction total. VAT values are saved with each transaction so reporting remains accurate even if VAT settings change later.

### Ticketing

Ticketing provides an operational view of completed checkout orders. After an order is checked out, it appears in the ticket system where staff can track whether it is pending, served, or voided. This supports basic order queue handling for food and beverage shops.

### Pending Tickets

Pending tickets show orders that have been checked out but not yet marked as served. Pending orders are displayed as a live queue from oldest to newest. Queue numbers automatically update when orders are served or voided.

### Served Tickets

Orders can be marked as served once preparation or fulfillment is complete. Served tickets remain available in the ticket view, allowing staff to distinguish fulfilled orders from active pending orders.

### Voided Tickets

Completed transactions can be voided with a required reason. Voided tickets remain visible for audit purposes instead of being deleted. Voided transactions are excluded from sales totals but remain included in transaction-level export records.

### Void After Completion

The app allows a transaction to be voided after checkout has already been completed. This preserves the original transaction record while marking it as voided and recording the void reason and void timestamp. This is useful for mistakes, cancellations, or operational corrections.

### Transaction Sync

Transaction sync uploads POS transaction events so they can be viewed in the owner dashboard. Synced events include completed transactions, served status changes, and voided status changes. The POS writes data locally first, then queues sync events so checkout can continue even when connectivity is unreliable.

### Settings Sync

Settings sync uploads POS configuration snapshots and allows owner-requested configuration updates to be applied by POS devices. The owner dashboard can request that selected devices apply a chosen settings snapshot. POS devices receive these requests during background sync and can apply them without blocking checkout work.

## POS Reporting Features

### POS Reporting

The POS app includes local reporting for reviewing sales and transaction activity directly on the device. Reports use the selected date range and local transaction records. On-screen totals exclude voided transactions from sales summaries while preserving voided records for audit exports.

### CSV Export

Reports can be exported as CSV files for use in spreadsheets, accounting tools, or external review. CSV export uses the selected report type and date range. Export feedback is shown in the POS app so the user knows whether the file was generated successfully.

### XLSX Export

Reports can also be exported as Excel-compatible XLSX files. This gives shops a more spreadsheet-friendly format for report review, sharing, and bookkeeping. XLSX exports contain the same report data as the selected generated report.

### Transaction Report

The Transaction Report provides the most detailed audit-style export. It includes transaction number, date and time, transaction status, void reason when applicable, payment method, order type, reference ID, subtotal, discounts, adjustments, VAT, total, payment amount, change, and item summary. Both completed and voided transactions are included.

### Sales Summary

The Sales Summary report provides a high-level summary for the selected date range. It includes transaction count, subtotal, discounts, adjustments, net sales, cash total, card total, and VAT. This report is useful for daily, weekly, or custom period sales review.

### Sales by Item

Sales by Item groups completed sales by item name and shows quantity sold and total sales per item. The report uses transaction item snapshots, so historical sales remain tied to the item name that existed at checkout time.

### Sales by Category

Sales by Category groups completed sales by category and shows quantity sold and total sales per category. Category information is snapshotted at checkout, which prevents past reports from changing when items are moved between categories later.

### Sales by Payment Type

Sales by Payment Type summarizes transactions by payment method, such as cash and card. It shows the transaction count and total collected for each payment type. This helps shops reconcile cash and online/card payments.

### Discounts Report

The Discounts report shows discount usage by transaction. It includes the transaction number, date/time, discount label, discount total, and transaction total. This helps shops monitor how often discounts are used and how much revenue is reduced by discounts.

### VAT Report

The VAT report shows VAT details by transaction. It includes whether VAT was enabled, the VAT percentage, VATable sales, VAT amount, and transaction total. This is useful for tax review and VAT-related bookkeeping.

## Owner Dashboard Features

### Dashboard Overview

The owner dashboard provides a business-level view of synced POS data. It summarizes sales, transactions, devices, and sync health from registered POS devices. This is designed for owners who want visibility without opening the POS device itself.

### Net Sales Metric

The net sales metric shows sales performance for the selected dashboard date range. It is based on synced completed transactions and excludes voided transactions from the total. This gives owners a quick view of actual recognized sales.

### Transaction Count

The transaction count shows how many completed transactions occurred in the selected dashboard range. It helps owners understand sales volume alongside revenue. Voided transactions are not counted as completed sales in this summary.

### Average Sale

Average sale shows the average value of completed transactions in the selected date range. This helps owners understand typical order size and track whether customers are spending more or less over time.

### Active Devices Count

Active devices count shows how many registered POS devices are currently active for the shop. This helps owners monitor their device footprint and identify whether devices have been disabled or are no longer in use.

### Sales Trend Chart

The sales trend chart visualizes sales over time using synced transaction data. It uses local POS transaction dates so chart buckets align with POS report date ranges. This helps owners spot sales patterns across days or custom periods.

### Net / Gross / All Sales View

The dashboard sales chart can be switched between net sales, gross sales, or both. This allows owners to compare revenue before and after deductions such as discounts, adjustments, and VAT depending on the selected view.

### Date Range Filters

Dashboard analytics can be filtered using preset ranges such as 7 days, 14 days, and 30 days, or a custom date range. Custom ranges prevent future dates from being selected. The selected range affects dashboard metrics and charts.

### Top Selling Items

Top Selling Items shows the best-performing menu items based on synced completed transactions. When fewer than five items have sold, the dashboard can fill the remaining display with unsold regular menu items from uploaded configuration snapshots.

### Payment Split

Payment Split shows how sales are divided between payment methods such as cash and card. This helps owners understand customer payment behavior and compare payment collection channels.

### Device Sales Contribution

Device Sales Contribution compares sales totals across registered POS devices. This is useful for shops with more than one register or device, allowing owners to see which devices are contributing to sales activity.

### Device Sync Health

Device Sync Health shows registered devices and their recent sync/online status. Owners can see whether devices have synced or appeared online recently, helping them identify stale or disconnected devices.

## Owner Reporting Features

### Owner-side Reports

Owner-side reports generate business reports from synced POS transaction data. Unlike POS reports, these reports can cover data from multiple registered devices. They are designed for centralized owner review and export.

### Dashboard Transaction Report

The dashboard Transaction Report lists synced transaction records across devices. It includes key transaction details such as transaction number, date/time, device, status, void reason, payment method, order type, item summary, subtotal, and total.

### Dashboard Sales Summary

The dashboard Sales Summary provides aggregate sales totals from synced transactions. It includes totals such as transaction count, subtotal, discounts, adjustments, net sales, VAT, and total. This is useful for owner-level sales review across devices.

### Dashboard Sales by Item

Dashboard Sales by Item groups synced completed sales by item. It shows quantity sold and total sales per item across the selected filters. This helps owners identify product performance beyond a single POS device.

### Dashboard Sales by Category

Dashboard Sales by Category groups synced completed sales by category. It uses the category snapshot saved with each transaction item, so historical reporting remains stable even if the menu structure changes.

### Dashboard Sales by Payment Type

Dashboard Sales by Payment Type summarizes synced sales by payment method. It shows transaction count and total per payment type, allowing owners to compare cash and card/online collection.

### Dashboard Discounts Report

The dashboard Discounts Report shows discount usage from synced completed transactions. It helps owners monitor discount activity across one or more POS devices.

### Dashboard VAT Report

The dashboard VAT Report shows VAT-related transaction details from synced data. It includes VAT enabled status, VAT percentage, VAT amount, and transaction total.

### Dashboard CSV Export

Owner dashboard reports can be exported as CSV files. The export respects the selected report type and filters, making it useful for spreadsheet analysis or record keeping.

### Dashboard XLSX Export

Owner dashboard reports can be exported as XLSX files. This provides an Excel-compatible format for reviewing, sharing, or storing owner-level reports.

### Report Date Filter

Owner reports can be filtered by start and end date. This allows owners to generate daily, weekly, monthly, or custom-period reports from synced transaction data.

### Report Device Filter

Owner reports can be filtered by POS device. This supports per-register or per-device analysis, which is useful when a shop operates more than one POS terminal.

### Report Payment Method Filter

Owner reports can be filtered by payment method, such as cash or card. This helps owners isolate payment-specific totals and reconcile collections.

### Report Order Type Filter

Owner reports can be filtered by dine-in or take-out order type. This allows owners to compare sales behavior across service channels.

### Report Transaction Status Filter

Owner reports can be filtered by transaction status, including completed, voided, or all transactions. This supports both sales-focused reporting and audit review.

## Owner Device Management Features

### Add Device

The owner dashboard can start the process of adding a new POS device to the shop. The owner enters an optional device name and generates an activation token for that device.

### Activation Token

Activation tokens are single-use credentials used to register POS devices. Tokens are valid for a limited period and are burned after successful activation. This links the POS device to the correct owner, shop, and device identity.

### QR Code Setup

The dashboard displays a QR code for the device setup URL. This makes it easier to activate a POS device by scanning the code instead of manually typing the setup link or token.

### Registered Device List

The owner dashboard lists registered POS devices connected to the shop. Each device entry includes device name, device code, registration date, status, last transaction sync, and last online information.

### Last Transaction Sync Status

The dashboard shows when each device last synced transaction data. This helps owners understand whether sales data from a device is current in the dashboard.

### Last Online Status

The dashboard shows when each registered device was last seen online. This helps identify devices that may be offline, inactive, or no longer syncing.

### Disable Device

Owners can disable a registered POS device without deleting its historical records. This prevents the device from being treated as active while preserving past transaction history for reports and audit purposes.

## Owner Config Sync Features

### Config Snapshots

POS devices upload configuration snapshots that can be viewed in the owner dashboard. These snapshots represent menu and settings data from a device at a specific point in time.

### Push Settings to Devices

Owners can select a configuration snapshot and request selected active devices to apply it. This allows menu and settings changes to be distributed across devices without manually importing settings on each POS device.

### Config Sync Progress

The dashboard tracks config sync requests and shows their current status. Statuses can include requested, seen, accepted, applied, or failed, depending on where the target device is in the sync process.

### Config Sync Error Display

If a config sync request fails, the dashboard can display the last error message. This gives owners visibility into why a settings sync did not complete successfully.

## Owner Profile Features

### Edit Owner Name

Owners can update the owner name associated with the account. The updated owner name is saved to the owner profile and reflected in the current owner session.

### Edit Business / Shop Name

Owners can update the business or shop name associated with the account. This affects the name shown in the owner dashboard and shop profile.

### Password Reset

Owners can trigger a password reset flow through the configured authentication provider. When Supabase authentication is configured, the reset request is sent through Supabase Auth.

## Subscription

### Subscription Page

The owner dashboard includes a Subscription section as a prepared UI surface. Billing actions are not currently connected to a backend, so this page should be treated as a placeholder rather than an active billing feature.
