const PIN_NOTE_LABEL = "Institutional authorization PIN:";

export function institutionalPinNote(currentNote, pin) {
  const retained = String(currentNote || "")
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().toLowerCase().startsWith(PIN_NOTE_LABEL.toLowerCase()));
  retained.push(`${PIN_NOTE_LABEL} ${pin}`);
  return retained.filter((line, index, lines) => line.trim() || (index > 0 && index < lines.length - 1)).join("\n").trim();
}

export async function syncInstitutionalPinNote(square, customerId, pin) {
  if (!customerId || !pin) return;
  const { customer } = await square.retrieveCustomer(customerId);
  await square.updateCustomer(customerId, {
    note: institutionalPinNote(customer?.note, pin),
    ...(customer?.version != null ? { version: customer.version } : {})
  });
}
