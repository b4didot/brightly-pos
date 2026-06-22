# Brightly POS

Brightly POS is a local-first point-of-sale application for small food and beverage shops. It runs as a Vite web app during development and as an installable PWA in production.

This guide explains how to download the project and run it on your computer.

## What You Need

Install these before running the app:

- Git
- Node.js
- npm

Node.js includes npm. If you are unsure which Node.js version to install, use the current LTS version from the official Node.js website.

## Download The Project

Open a terminal and run:

```sh
git clone <repository-url>
```

Then go inside the project folder:

```sh
cd brightly-pos
```

Replace `<repository-url>` with the actual GitHub repository URL.

## Install Dependencies

Run this once after cloning the project:

```sh
npm install
```

This downloads everything the app needs to run.

## Run The App Locally

Start the local development server:

```sh
npm run dev
```
After the command runs, the terminal will show a local URL, usually:

```txt
http://localhost:5173
```

Open that URL in your browser. The root URL shows the public landing page.
Use `/dashboard` for owner login or account creation, `/device/setup` for PWA
device setup, and `/pos` for the registered POS app.

## Optional Backend API

Owner login, device token generation, device registration, and sync upload call a backend when this Vite environment variable is configured:

```sh
VITE_BRIGHTLY_API_URL=https://your-api.example.com
```

When the variable is not set, those flows use local development fallbacks in browser storage so the app can be tested without a backend.

The owner dashboard Add Device flow creates a single-use activation token valid
for 30 days and shows the token, a PWA setup URL, and a QR code for that URL.
The setup URL opens the Brightly POS PWA setup route on the target device.

Production, Vercel, and Supabase environment variables are documented in
`docs/ENVIRONMENT.md`.
Supabase database and Edge Function setup is documented in `docs/SUPABASE.md`.

## Pull Local Environment Variables

The Vercel CLI is installed as a dev dependency. After the project is linked,
pull Vercel environment variables into the ignored local file:

```sh
npx vercel env pull .env.local --yes --environment=production
```
Use production only when you intentionally want local development to point at
the production Supabase project. Use `--environment=development` when Vercel has
development values configured.

## Build The Web App

To check that the app can be built for production:

```sh
npm run build
```

This creates a production build in the `dist` folder.

## Preview The Production Build

After building, you can preview the production version locally:

```sh
npm run preview
```

The terminal will show a local URL that you can open in your browser.

## Install As A Web App

The production web build includes PWA support through `vite-plugin-pwa`.

On supported browsers, Brightly POS can be installed to the device home screen
and opens in standalone mode without browser UI. The app shell and built assets
are cached by the service worker so the installed web app can load without
internet after the first successful visit.

## Useful Commands

```sh
npm install
npm run dev
npm run build
npm run preview
npm run lint
```

## Main Dependencies

The app uses:

- React for the user interface
- TypeScript for safer code
- Vite for local development and builds
- vite-plugin-pwa for installable offline web app support
- Tailwind CSS for styling
- Supabase for production owner auth, device activation, and cloud sync event storage
- Zustand for app state
- Dexie and IndexedDB for local data storage
- QRCode for local setup QR generation
- XLSX for report exports
- lucide-react for icons

## Local Data

Brightly POS stores app data locally in the browser or installed PWA using IndexedDB.

This means:

- The app can work without internet for normal local use.
- Local browser data can be cleared if the browser storage is deleted.
- Development data on one computer or browser is separate from another device.

## Troubleshooting

If the app does not start, try:

```sh
npm install
npm run dev
```

If the browser page is already open but not updating, stop the terminal command with `Ctrl + C`, then run:

```sh
npm run dev
```
