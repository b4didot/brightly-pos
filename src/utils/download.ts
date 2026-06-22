type ReportFileInput = {
  data: string;
  filename: string;
  mimeType: string;
  encoding?: "base64" | "text";
};

export async function downloadFile({
  data,
  filename,
  mimeType,
  encoding = "text",
}: ReportFileInput) {
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

function base64ToBlob(value: string, mimeType: string) {
  const bytes = Uint8Array.from(window.atob(value), (character) => character.charCodeAt(0));
  return new Blob([bytes], { type: mimeType });
}
