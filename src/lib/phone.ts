export function formatNorthAmericanPhone(value: string) {
  const raw = value.replace(/\D/g, "").slice(0, 11);
  const national = raw.startsWith("1") ? raw.slice(1) : raw.slice(0, 10);
  if (!national) return raw ? "+1" : "";
  const area = national.slice(0, 3), exchange = national.slice(3, 6), line = national.slice(6, 10);
  return `+1${area ? ` (${area}${area.length === 3 ? ")" : ""}` : ""}${exchange ? ` ${exchange}` : ""}${line ? `-${line}` : ""}`;
}
