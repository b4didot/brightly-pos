import { Capacitor, registerPlugin } from "@capacitor/core";

type ReportFileInput = {
  data: string;
  filename: string;
  mimeType: string;
  encoding?: "base64" | "text";
};

type ReportDownloaderPlugin = {
  save(options: { data: string; filename: string; mimeType: string }): Promise<{
    filename: string;
    uri: string;
  }>;
};

const ReportDownloader = registerPlugin<ReportDownloaderPlugin>("ReportDownloader");

export async function downloadFile({
  data,
  filename,
  mimeType,
  encoding = "text",
}: ReportFileInput) {
  if (Capacitor.isNativePlatform()) {
    await ReportDownloader.save({
      data: encoding === "base64" ? data : textToBase64(data),
      filename,
      mimeType,
    });

    return;
  }

  const blob =
    encoding === "base64"
      ? base64ToBlob(data, mimeType)
      : new Blob([data], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function textToBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
}

function base64ToBlob(value: string, mimeType: string) {
  const bytes = Uint8Array.from(window.atob(value), (character) => character.charCodeAt(0));
  return new Blob([bytes], { type: mimeType });
}
