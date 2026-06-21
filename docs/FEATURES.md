# Brightly POS Features

This document describes the features currently implemented in the app.

## App Access

Brightly POS opens at the public landing page in a normal browser tab. The landing page introduces the app and has a Get Started button for owner login or account creation. When launched from an installed PWA icon, Brightly POS opens through the POS setup/registration gate instead of the public landing page.

The main web routes are:

- `/`
- `/dashboard`
- `/owner/register`
- `/owner/login`
- `/device/setup`
- `/pos`

The POS route requires device registration before the register opens. In production, the POS shell also requires installed PWA mode; a normal browser tab shows the PWA setup/install flow instead of the register, even if that browser has local device registration data. Local development can still open the POS in a browser for testing.

The owner portal uses Supabase Auth when Supabase frontend variables are configured. Production owners must verify their email before managing dashboard devices. Without Supabase or a backend API URL, the app uses a local development fallback to create owner accounts and generate single-use device registration tokens.

The owner dashboard is a management surface with Overview, Reports, Devices, Config Sync, Profile, and Subscription sections behind a slide-out navigation drawer. Overview shows synced transaction summaries, a filterable sales trend with 7 Days, 14 Days, 1 Month, and Custom date ranges, top selling items, payment split, device sales contribution, and device sync health from uploaded POS sync events. When fewer than five items have sold, Top Selling Items fills the remaining space with unsold regular menu items from uploaded config snapshots. Custom sales trend ranges cannot select future dates. Dashboard data visuals use the system teal and apricot colors for chart objects. Reports can export the same report families as the POS report screen with owner-side filters for date range, device, payment method, order type, and transaction status. Devices keeps the existing add-device token and QR workflow, lists registered devices, shows last transaction sync and last online time, and can disable a device without deleting its historical records.

The Config Sync section shows uploaded POS configuration snapshots and lets the owner request that active devices apply a selected snapshot. POS devices receive requests during background sync and show a persistent non-modal banner with Apply Now and Later actions, so checkout and ticket work can continue while the request is pending. Subscription is a prepared UI page only; billing actions are not connected to a backend yet.

The first-time setup flow is split between the owner dashboard and the POS PWA. The owner dashboard has an Add Device workflow that generates a single-use token valid for 30 days and shows three activation aids: the token, the PWA setup URL with the token in the `t` query parameter, and a QR code for that same tokenized URL. Activation tokens remain visible in the dashboard because they are single-use and burn after activation. The dashboard instruction is only to open the address on the device and use the token to activate it.

The device setup page lives inside the Brightly POS PWA. The setup URL opens the PWA route on the target device. In browser mode, the setup screen asks whether the device is an Android phone or tablet, or an iPhone or iPad, then shows manual home-screen installation instructions. Android instructions direct the owner to the browser three-dot menu, Add to Home screen, then Install. iPhone and iPad devices see Safari Share and Add to Home Screen instructions. When `/device/setup?t=TOKEN` is opened in browser mode, the page points the install manifest at that same tokenized setup URL so the installed PWA can reopen it. If the installed PWA opens `/device/setup?t=TOKEN`, the page shows an Activate Device button and burns that URL token only after the owner taps activate. If no token is present in the installed PWA URL, manual token entry remains available.

A registered POS device stores server-style owner/shop/device identity and credential fields locally. After registration, the installed PWA can continue opening and operating offline. There is no cashier login, PIN, role gate, or permission model.

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

Temporary: Device & Sync includes a Seed demo orders action for loading historical test orders onto a registered device. This writes local transactions, transaction item snapshots, and pending sync events from May 1 through the current device date, then attempts a sync upload. Remove this action after the test data has been seeded.

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

Settings, menu, payment, VAT, discount, adjustment, and settings import changes also create local `settings.snapshot` sync outbox entries after local persistence succeeds. These snapshots upload silently when online and power the owner dashboard's Config Sync view.

## Feature Maintenance

Update this document when:

- A user-facing workflow changes.
- A settings section is added or removed.
- Report export fields change.
- Checkout behavior changes.
- Android behavior changes.
