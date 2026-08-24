export const ENTRY_TYPES = Object.freeze(["sale", "payment", "credit", "refund", "adjustment", "reversal", "write_off"]);

export function summarizeLedger(entries, reservations = [], creditLimit = 0) {
  const postedBalance = entries.reduce((sum, entry) => sum + Number(entry.amount), 0);
  const reserved = reservations.filter((item) => item.status === "active").reduce((sum, item) => sum + Number(item.amount), 0);
  return {
    creditLimit: Number(creditLimit),
    postedBalance,
    reserved,
    available: Number(creditLimit) - postedBalance - reserved
  };
}

export function assertCreditAvailable(summary, requestedAmount) {
  if (!Number.isInteger(requestedAmount) || requestedAmount <= 0) throw new Error("A positive integer amount is required.");
  if (requestedAmount > summary.available) {
    const error = new Error("The order exceeds available credit.");
    error.code = "CREDIT_LIMIT_EXCEEDED";
    error.details = { requested: requestedAmount, available: summary.available };
    throw error;
  }
}

export function statementTotals(entries, openingBalance = 0) {
  const charges = entries.filter((entry) => Number(entry.amount) > 0).reduce((sum, entry) => sum + Number(entry.amount), 0);
  const credits = entries.filter((entry) => Number(entry.amount) < 0).reduce((sum, entry) => sum + Math.abs(Number(entry.amount)), 0);
  return { openingBalance, charges, credits, closingBalance: openingBalance + charges - credits };
}
