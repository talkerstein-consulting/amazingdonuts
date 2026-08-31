export function nextDateRangeSelection(current, date) {
  if (!current?.from || current.to) return { from: date, to: undefined };
  if (date <= current.from) return { from: date, to: undefined };
  return { from: current.from, to: date };
}
