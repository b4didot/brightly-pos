# Brightly POS Implementation Plan

This document captures implementation direction that should guide future phases.
Keep it aligned with `docs/ARCHITECTURE.md` and `docs/FEATURES.md` when flows
change.

## First-Time User And Device Setup Flow

This section is not a standalone implementation phase. It defines the user
experience that owner registration, the owner dashboard, device activation, and
first launch behavior must be built around.

The device setup flow happens inside the same Brightly POS PWA. It is not a
separate standalone app, native app store install, or dashboard-driven install
wizard. The owner dashboard only bridges the owner to the target device by
creating a single-use activation token and showing the PWA setup URL and QR
code.

### Owner Side

The owner visits `brightlyph.com`, clicks Get Started, registers with email and password, and
creates a shop with the shop name and required business details. After the shop
is created, the owner lands on the dashboard.

From the dashboard, the owner clicks Add Device. The dashboard generates one
single-use activation token for the shop. The token is valid for 30 days. The
Add Device screen shows exactly three activation aids:

- The activation token.
- The PWA setup URL with the token embedded, such as
  `brightlyph.com/device/setup?t=TOKEN`.
- A QR code pointing to the same tokenized setup URL.

The dashboard instruction is: open this address on your device and use the
token below to activate it. The dashboard must not include Android, iOS, iPadOS,
or PWA installation walkthroughs.

### Device Side

The owner opens the setup URL on the target device by scanning the QR code or
typing the URL manually. The URL opens the Brightly POS PWA route on that
device.

The first setup screen asks the owner to choose the device type:

- Android Phone or Tablet.
- iPhone or iPad.

After the owner chooses a device type, the same PWA setup route shows matching
home-screen installation steps:

- Android uses the browser install prompt when available, with manual Add to
  Home Screen or Install app through the browser menu as fallback.
- iPhone and iPad use Safari Share, then Add to Home Screen.

After installation guidance, activation is shown only after the owner opens the
tokenized setup URL from the installed PWA. If the installed PWA is opened at
`/device/setup?t=TOKEN`, it shows an Activate Device button. The token is not
stored locally before activation; it is read from the current URL. When the
owner activates, the device sends the token to the server through the
registration service boundary. The server validates the token, burns it
immediately, links the device to the owner and shop, and returns the device id
and device credentials. The PWA stores the returned owner, shop, device, and
credential fields locally. If no token is present in the installed PWA URL,
manual token entry remains available as a fallback.

From that point forward, every launch on the registered device opens directly
to the POS. Setup, token entry, and registration screens do not appear again
unless local device data is intentionally reset.

### Phase Alignment

Registration work must keep owner account creation separate from POS device
activation. Owner registration belongs to the owner portal. Device activation
belongs to the PWA setup flow.

Dashboard work must keep Add Device focused on token creation, setup URL, and
QR code. The dashboard must not become a device-specific installation wizard.

Device activation work must happen inside the Brightly POS PWA. The setup route
may be opened first in a browser tab from the QR code or manual URL, but the
installation steps should bring the owner into the installed PWA before normal
POS use.

First launch behavior must be driven by local device registration state. A
registered device opens the POS directly. An unregistered device shows the PWA
setup flow.

### Acceptance Tests

- Add Device creates a single-use token with a 30-day expiration.
- The setup URL and QR code point to the same tokenized PWA setup route.
- The dashboard contains no platform-specific PWA installation instructions.
- The PWA setup route opens inside the Brightly POS app.
- Android selection shows Android-specific home-screen install steps.
- iPhone or iPad selection shows Safari Share and Add to Home Screen steps.
- Tokenized setup links show an Activate Device button only in the installed
  PWA.
- Manual token entry remains available when the installed PWA setup URL has no
  token.
- A valid token activates the device and opens the POS.
- A used or expired token cannot activate a device.
- A registered device opens the POS directly on future launches.
- After activation, checkout, tickets, reports, and settings continue to work
  without internet.
