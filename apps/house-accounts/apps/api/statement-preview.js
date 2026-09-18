const datePart = value => value instanceof Date ? value.toISOString().slice(0, 10) : String(value || "").slice(0, 10);

export function currentStatementWindow(account, now = new Date(), latestStatement = null) {
  const today = datePart(now);
  const day = new Date(`${today}T00:00:00Z`);
  let cycleStart;
  let nextStatementDate = null;
  if (account.billing_frequency === "weekly") {
    cycleStart = new Date(day);
    cycleStart.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
    const next = new Date(cycleStart);
    next.setUTCDate(next.getUTCDate() + 7);
    nextStatementDate = datePart(next);
  } else {
    cycleStart = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), 1));
    if (account.billing_frequency === "monthly")
      nextStatementDate = datePart(new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + 1, 1)));
  }
  const afterLast = latestStatement?.period_end
    ? datePart(new Date(new Date(`${datePart(latestStatement.period_end)}T00:00:00Z`).getTime() + 86400000))
    : "";
  const periodStart = [datePart(account.approved_at || account.created_at), afterLast]
    .filter(Boolean).sort().at(-1) || datePart(cycleStart);
  return {
    periodStart: periodStart > today ? today : periodStart,
    periodEnd: today,
    nextStatementDate,
  };
}
