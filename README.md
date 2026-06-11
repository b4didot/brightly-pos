# Brightly POS

Brightly POS is a local-first point-of-sale application for small food and beverage shops. It runs as a web app during development and can also be packaged as an Android app with Capacitor.

This guide explains how to download the project and run it on your computer.

## What You Need

Install these before running the app:

- Git
- Node.js
- npm

Node.js includes npm. If you are unsure which Node.js version to install, use the current LTS version from the official Node.js website.

Optional, only if you want to build the Android app:

- Android Studio
- Android SDK
- Java/JDK configured for Android builds

On Windows, Android Studio includes a bundled JDK. If `npm run android:apk`
fails with `JAVA_HOME is not set`, point `JAVA_HOME` to Android Studio's
bundled runtime:

```powershell
setx JAVA_HOME "C:\Program Files\Android\Android Studio\jbr"
```

Close and reopen the terminal after running `setx`, then verify Java is
available:

```powershell
java -version
echo $env:JAVA_HOME
```

If `java -version` is still not found, add the bundled JDK `bin` folder to your
user `PATH`, then reopen the terminal again:

```powershell
setx PATH "$env:PATH;C:\Program Files\Android\Android Studio\jbr\bin"
```

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

Open that URL in your browser.

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

## Android App Setup

The Android project is already included in the `android` folder.

Before using Android commands, make sure Android Studio, the Android SDK, and a working JDK are installed.

To build the web app and sync it into the Android project:

```sh
npm run android:sync
```

To open the Android project in Android Studio:

```sh
npm run android:open
```

To build a debug APK:

```sh
npm run android:apk
```

The debug APK will be created at:

```txt
android/app/build/outputs/apk/debug/app-debug.apk
```

## Useful Commands

```sh
npm install
npm run dev
npm run build
npm run preview
npm run lint
npm run android:sync
npm run android:open
npm run android:apk
```

## Main Dependencies

The app uses:

- React for the user interface
- TypeScript for safer code
- Vite for local development and builds
- Tailwind CSS for styling
- Zustand for app state
- Dexie and IndexedDB for local data storage
- Capacitor for Android packaging
- XLSX for report exports
- lucide-react for icons

## Local Data

Brightly POS stores app data locally in the browser or Android device using IndexedDB.

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

If Android commands fail, confirm that Android Studio, the Android SDK, and Java/JDK are installed and configured correctly.

On Windows with Android Studio installed, set `JAVA_HOME` to:

```txt
C:\Program Files\Android\Android Studio\jbr
```

If `java` is still not found after reopening the terminal, add:

```txt
C:\Program Files\Android\Android Studio\jbr\bin
```

to the user `PATH`.
