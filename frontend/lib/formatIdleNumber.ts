const SUFFIXES = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];

export function formatIdleNumber(value: number): string {
  if (!Number.isFinite(value)) return "∞";
  const sign = value < 0 ? "-" : "";
  const absolute = Math.abs(value);
  if (absolute < 1_000) {
    const digits = absolute < 10 && absolute % 1 !== 0 ? 1 : 0;
    return sign + absolute.toLocaleString("pt-BR", { maximumFractionDigits: digits });
  }
  const index = Math.min(SUFFIXES.length - 1, Math.floor(Math.log10(absolute) / 3));
  if (index >= SUFFIXES.length - 1 && absolute >= 1e36) return sign + absolute.toExponential(2).replace(".", ",");
  const scaled = absolute / Math.pow(1_000, index);
  const digits = scaled < 10 ? 1 : 0;
  return sign + scaled.toLocaleString("pt-BR", { maximumFractionDigits: digits }) + SUFFIXES[index];
}
