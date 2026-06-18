# Brightly POS Features

This document describes the features currently implemented in the app.

## App Access

Brightly POS opens at the public landing page in a normal browser tab. The landing page introduces the app and has a Get Started button for owner login or account creation. When launched from an installed PWA icon, Brightly POS opens the POS device route instead of the public landing page.

The main web routes are:

- `/`
- `/dashboard`
- `/owner/register`
- `/owner/login`
- `/device/setup`
- `/pos`

The POS route requires device registration before the register opens. An unregistered POS device shows the PWA device setup flow.

The owner portal uses Supabase Auth when Supabase frontend variables are configured. Production owners must verify their email before managing dashboard devices. Without Supabase or a backend API URL, the app uses a local development fallback to create owner accounts and generate single-use device registration tokens.

The first-time setup flow is split between the owner dashboard and the POS PWA. The owner dashboard has an Add Device workflow that generates a single-use token valid for 30 days and shows three activation aids: the token, the PWA setup URL, and a QR code for the same URL. The dashboard instruction is only to open the address on the device and use the token to activate it.

The device setup page lives inside the Brightly POS PWA. The setup URL opens the PWA route on the target device. In browser mode, the setup screen asks whether the device is an Android phone or tablet, or an iPhone or iPad, then shows manual home-screen installation instructions. Android instructions direct the owner to the browser three-dot menu, Add to Home screen, then Install. iPhone and iPad devices see Safari Share and Add to Home Screen instructions. Token entry is shown only after Brightly POS is launched from the installed PWA. New PWA installs start at `/pos`; if an already-installed PWA opens `/`, the app detects standalone mode and routes into the POS setup/registration gate.

A registered POS device stores server-style owner/shop/device identity and credential fields locally. After registration, the POS can continue opening and operating offline. There is no cashier login, PIN, role gate, or permission model.

Production web builds can be installed to a device home screen as a PWA. The
installed app opens in standalone mode without browser UI on supported browsers,
including iPhone and iPad home-screen installs. After the first successful load,
the service worker caches the built app shell and static assets so the web app
can open offline. Global page overscroll is disabled so supported mobile
browsers do not trigger pull-to-refresh or bounce-style overscroll while using
the app, and scrollbar chrome is hidden to keep the installed app feeling like a
native POS surface. Mobile viewport zoom is disabled for the installed register
experience.

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
- Online checkout.
- Discount application from the payment review modal.
- Inclusive VAT display.

Completed orders use human-readable transaction numbers with order type, shop code, device code, date, and daily sequence, such as `DI-0101-06152026-0001`.

Items with variants, modifiers, or add-ons open a customization modal before being added to cart.

On smaller screens, the cart is shown through a cart sheet with minimized, half, and full states. After a successful checkout, the cart sheet returns to the minimized state.

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
- Applied after a payment method is selected, from the payment review modal.

Discounts are computed against subtotal and cannot reduce the cart below zero.

## Adjustments

Adjustments are configurable additional charges. They are separate from discounts and VAT.

Supported adjustment types:

- Percentage.
- Flat amount.

Enabled adjustments are automatically applied to the cart after discounts. Adjustment values are treated as non-negative charges; discounts must use the Discounts workflow instead.

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
- Online checkout, backed by the existing card payment method.

Settings can enable or disable each method, but the app prevents disabling both at the same time.

Online checkout currently requires a reference ID in the payment modal.

## Tickets

The tickets view can be filtered by:

- Pending.
- Served.
- Voided.
- All.

The all tickets view shows tickets from newest to oldest without grouping by status.

Pending tickets are shown as a live order queue from oldest to newest. Queue labels renumber automatically when a pending order is served or voided.

Users can:

- Mark transactions as served.
- Void transactions with a required reason.

Voided orders stay visible in tickets and the Transaction Report export, but are excluded from on-screen report totals and summary reports.

## Reports

The report screen supports:

- Compact `mm/dd/yy` date range filtering with a modal date picker.
- Prominent total transaction and net sales summaries.
- Cash total.
- Card payment total.
- Discount summary.
- VAT summary.
- Adjustment summary.
- Transaction table showing completed transactions only, including VAT per transaction.
- Report generation for Transaction Report, Sales Summary, Sales by Item, Sales by Category, Sales by Payment Type, Discounts, and VAT.
- CSV and XLSX export for generated reports.
- Toast feedback after report export succeeds or fails.

Report exports use the selected report type and current date range. Sales Summary exports include net sales as total collected minus discounts, adjustments, and VAT.
The Transaction Report export is a complete audit record for the date range and includes completed and voided transactions, VAT amount per transaction, transaction status, and void reason when applicable.
Sales by Category uses the category snapshot saved on each transaction item at checkout, so later menu/category edits do not move historical sales between categories.

## Settings

Settings sections currently include:

- Shop.
- Device & Sync.
- Settings Backup.
- Categories.
- Items.
- Modifiers.
- Add-ons.
- Adjustments.
- Discounts.
- Inclusive VAT.
- Payment options.

The Shop section controls the shop name shown in the app header plus primary and secondary color customization for the header branding.

The Device & Sync section shows registered owner, shop, device, last sync, and pending sync status.

The Settings Backup section can export and import local configuration as JSON. Settings exports include menu and configuration data, but not transactions or device credentials. Importing settings requires confirmation and does not replace the registered device identity.

Settings currently do not include cashier admin, PIN, role, or permission controls.

Primary add buttons inside settings sections are full-width section actions.

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

## Sync

Checkout, served, and voided transaction changes create local sync outbox entries. In production, pending entries upload to Supabase through the `sync-device-events` Edge Function with the registered device credentials. Without Supabase or a backend API URL, pending entries are locally acknowledged so the outbox flow can be tested during development.

## Feature Maintenance

Update this document when:

- A user-facing workflow changes.
- A settings section is added or removed.
- Report export fields change.
- Checkout behavior changes.
- Android behavior changes.
