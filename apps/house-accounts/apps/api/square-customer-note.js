import { accountCredit } from "./ledger.js";

const PIN_NOTE_LABEL = "Institutional authorization PIN:";
const BALANCE_NOTE_LABEL = "Institutional available credit:";

const managedLine = (lines, label) => lines.find((line) => line.trimStart().toLowerCase().startsWith(label.toLowerCase()));

export function institutionalAccountNote(currentNote, { pin, available, currency="CAD" }={}) {
  const lines=String(currentNote||"").split(/\r?\n/),existingPin=managedLine(lines,PIN_NOTE_LABEL),existingBalance=managedLine(lines,BALANCE_NOTE_LABEL);
  const retained=lines.filter((line)=>!line.trimStart().toLowerCase().startsWith(PIN_NOTE_LABEL.toLowerCase())&&!line.trimStart().toLowerCase().startsWith(BALANCE_NOTE_LABEL.toLowerCase()));
  const pinLine=pin?`${PIN_NOTE_LABEL} ${pin}`:existingPin;
  const balanceLine=available==null?existingBalance:`${BALANCE_NOTE_LABEL} ${new Intl.NumberFormat("en-CA",{style:"currency",currency}).format(Number(available)/100)}`;
  if(pinLine)retained.push(pinLine);
  if(balanceLine)retained.push(balanceLine);
  return retained.filter((line,index,all)=>line.trim()||(index>0&&index<all.length-1)).join("\n").trim();
}

export function institutionalPinNote(currentNote, pin) {
  return institutionalAccountNote(currentNote,{pin});
}

export async function syncInstitutionalPinNote(square, customerId, pin) {
  if (!customerId || !pin) return;
  const { customer } = await square.retrieveCustomer(customerId);
  await square.updateCustomer(customerId, {
    note: institutionalPinNote(customer?.note, pin),
    ...(customer?.version != null ? { version: customer.version } : {})
  });
}

export async function syncInstitutionalBalanceNote(square, customerId, available, currency="CAD") {
  if(!customerId||available==null)return;
  const {customer}=await square.retrieveCustomer(customerId);
  await square.updateCustomer(customerId,{
    note:institutionalAccountNote(customer?.note,{available,currency}),
    ...(customer?.version!=null?{version:customer.version}:{})
  });
}

export async function syncInstitutionalAccountBalance(pool,square,accountId) {
  if(!accountId)return null;
  const [accountResult,credit]=await Promise.all([
    pool.query(`SELECT a.square_customer_id,array_remove(array_agg(DISTINCT cp.square_customer_id),NULL) AS purchaser_customer_ids FROM accounts a LEFT JOIN account_users au ON au.account_id=a.id AND au.status='active' LEFT JOIN customer_profiles cp ON cp.tenant_id=a.tenant_id AND cp.user_id=au.user_id WHERE a.id=$1 GROUP BY a.id`,[accountId]),
    accountCredit(pool,accountId)
  ]);
  if(!accountResult.rowCount)return null;
  const account=accountResult.rows[0],customerIds=[...new Set([account.square_customer_id,...(account.purchaser_customer_ids||[])].filter(Boolean))];
  const results=await Promise.allSettled(customerIds.map((customerId)=>syncInstitutionalBalanceNote(square,customerId,credit.available,"CAD")));
  results.forEach((result,index)=>{if(result.status==="rejected")console.error("Square institutional customer note skipped",{customerId:customerIds[index],error:result.reason?.message||String(result.reason)});});
  return credit;
}
