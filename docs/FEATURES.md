# Brightly POS Features

This document describes the features currently implemented in the app.

## App Access

Brightly POS opens directly into the register. There is no activation token, PIN login, role gate, or permission gate in the current app.

## Order Screen

The order screen supports:

- Category filtering.
- Product grid.
- Add-to-cart.
- Quantity changes.
- Item removal.
- Dine-in or take-out order type.
- Cart totals.
- Cash checkout.
- Card checkout.
- Discount application.
- Inclusive VAT display.

Items with variants, modifiers, or add-ons open a customization modal before being added to cart.

## Item Customization

Supported customization types:

- Variants with separate prices.
- Modifiers with selected options.
- Paid add-ons linked to menu items.

Selected customization data is stored on the cart line and snapshotted into transaction items at checkout.

## Discounts

Discounts can be:

- Created as reusable templates in settings.
- Percentage-based.
- Flat amount.
- Applied to the cart before checkout.

Discounts are computed against subtotal and cannot reduce the cart below zero.

## Adjustments

Adjustments are configurable additions or deductions.

Supported adjustment types:

- Percentage.
- Flat amount.

Enabled adjustments are automatically applied to the cart after discounts.

## VAT

VAT is currently inclusive.

The app can:

- Enable or disable VAT.
- Set VAT percentage.
- Compute VATable sales and VAT amount from the final total.
- Snapshot VAT values into the transaction.

## Payment Methods

Supported payment methods:

- Cash.
- Card.

Settings can enable or disable each method, but the app prevents disabling both at the same time.

Card checkout currently requires a reference ID in the payment modal.

## Tickets

The tickets view shows transactions grouped by:

- Pending.
- Served.
- Voided.

Users can:

- Mark transactions as served.
- Void transactions with a required reason.

Voided orders stay visible in tickets but are excluded from reports.

## Reports

The report screen supports:

- Start and end date filtering.
- Transaction count.
- Subtotal summary.
- Discount summary.
- Adjustment summary.
- Cash total.
- Card total.
- Transaction table.
- CSV export.
- XLSX export.

Report exports include transaction details and item snapshots.

## Settings

Settings sections currently include:

- Categories.
- Items.
- Modifiers.
- Add-ons.
- Adjustments.
- Discounts.
- Inclusive VAT.
- Payment options.

## Categories

Users can:

- Create categories.
- Edit categories.
- Delete categories.
- Assign category colors.

Deleting a category uncategorizes linked items.

## Items

Users can:

- Create items.
- Edit items.
- Delete items.
- Assign items to categories.
- Toggle out-of-stock status.
- Link variants, modifiers, and add-ons.

Out-of-stock items cannot be added to cart.

## Add-Ons

Add-ons are stored as items with `isAddOn: true`.

Users can:

- Create add-on items.
- Link add-ons to regular items.
- Unlink add-ons.

## Modifiers

Users can:

- Create modifier groups.
- Define options.
- Link modifiers to items.
- Unlink modifiers.

Modifiers currently do not add price.

## Android File Downloads

On Android, reports are saved through the custom Capacitor `ReportDownloader` plugin.

On web, downloads use browser file download behavior.

## Feature Maintenance

Update this document when:

- A user-facing workflow changes.
- A settings section is added or removed.
- Report export fields change.
- Checkout behavior changes.
- Android behavior changes.
