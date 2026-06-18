import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
	base: "/",
	plugins: [
		react(),
		tailwindcss(),
		VitePWA({
			registerType: "autoUpdate",
			includeAssets: [
				"favicon.svg",
				"apple-touch-icon.png",
				"pwa-192x192.png",
				"pwa-512x512.png",
			],
			manifest: {
				name: "Brightly POS",
				short_name: "Brightly POS",
				description: "Local-first point-of-sale for small food and beverage shops.",
				theme_color: "#d97706",
				background_color: "#f7f4ef",
				display: "standalone",
				orientation: "any",
				scope: "/",
				icons: [
					{
						src: "/pwa-192x192.png",
						sizes: "192x192",
						type: "image/png",
					},
					{
						src: "/pwa-512x512.png",
						sizes: "512x512",
						type: "image/png",
					},
					{
						src: "/pwa-512x512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "maskable",
					},
				],
			},
			workbox: {
				globPatterns: ["**/*.{js,css,html,svg,png,ico,webmanifest}"],
				navigateFallback: "index.html",
				cleanupOutdatedCaches: true,
			},
		}),
	],
});
