export function formatPeso(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

export function formatSignedPeso(amount: number) {
  const sign = amount < 0 ? "-" : amount > 0 ? "+" : "";
  return `${sign}${formatPeso(Math.abs(amount))}`;
}

export function parsePesoInput(value: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.round(parsed * 100);
}

export function toPesoNumber(amount: number) {
  return Number((amount / 100).toFixed(2));
}
