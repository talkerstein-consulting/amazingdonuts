import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const cash = (amount, currency="CAD") => new Intl.NumberFormat("en-CA", { style:"currency", currency }).format(Number(amount)/100);
export const statementDate = (value) => {
  if (!value) return "Date unavailable";
  const raw=value instanceof Date&&value.getUTCHours()===0&&value.getUTCMinutes()===0&&value.getUTCSeconds()===0?value.toISOString().slice(0,10):String(value);
  const parsed=new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw)?`${raw}T12:00:00Z`:raw);
  return Number.isNaN(parsed.getTime())?"Date unavailable":parsed.toLocaleDateString("en-CA", { year:"numeric", month:"short", day:"numeric",timeZone:"America/Toronto" });
};

export async function statementPdf(statement, tenant, account) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(23/255,57/255,74/255), accent = hex(tenant.brand?.accent || "#c91b86"), rule = rgb(.76,.78,.79);
  const entries = statement.snapshot.entries || [];
  const payments=(statement.payments||[]).filter(payment=>payment.status==="completed"),paidTotal=payments.reduce((total,payment)=>total+Number(payment.amount||0),0),balanceDue=Math.max(0,Number(statement.closing_balance)-paidTotal);
  let page, y, pageNumber = 0;
  const addPage = () => {
    page = pdf.addPage([612,792]); pageNumber += 1; y = 740;
    page.drawText(tenant.name,{x:42,y,size:14,font:bold,color:ink}); page.drawLine({start:{x:42,y:y-22},end:{x:570,y:y-22},thickness:2,color:accent}); y-=58;
    if (pageNumber>1) { page.drawText(`${account.billing_contact}  ·  ${account.organization_name}  ·  ${statementDate(statement.period_start)} - ${statementDate(statement.period_end)}`,{x:42,y,size:8,font:regular,color:ink}); y-=36; }
  };
  const footer = () => page.drawText(`Page ${pageNumber}`,{x:520,y:28,size:8,font:regular,color:rgb(.45,.45,.45)});
  const row = (label,value,top=y) => { page.drawText(label,{x:42,y:top,size:10,font:regular,color:ink}); page.drawText(value,{x:570-(value.length*5.7),y:top,size:10,font:bold,color:ink}); };
  addPage();
  page.drawText("Account details",{x:42,y,size:18,font:bold,color:ink}); y-=28;
  const lastPayment=payments[0]?.received_at||statement.paid_at||statement.snapshot.lastPayment;
  const columns = [["Bill to",`${account.billing_contact}\n${account.organization_name}`],["Invoice period",`${statementDate(statement.period_start)} - ${statementDate(statement.period_end)}`],["Last payment",lastPayment ? statementDate(lastPayment) : "N/A"],[balanceDue?"Payment due":"Payment status",balanceDue?`${cash(balanceDue,statement.currency)}\nDue ${statementDate(statement.due_at)}`:`Paid in full\n${lastPayment?statementDate(lastPayment):""}`]];
  columns.forEach(([label,value],index)=>{ const x=42+index*132; page.drawText(label,{x,y,size:8,font:bold,color:rgb(.35,.35,.35)}); value.split("\n").forEach((line,i)=>page.drawText(line,{x,y:y-15-i*13,size:8,font:regular,color:ink})); });
  y-=84; page.drawText("Account statement summary",{x:42,y,size:18,font:bold,color:ink}); y-=32;
  row("Opening balance",cash(statement.opening_balance,statement.currency)); y-=18; row("New charges",cash(statement.new_charges,statement.currency)); y-=18; row("Credits and payments",`-${cash(Number(statement.credits_and_payments)+paidTotal,statement.currency)}`); y-=22;
  page.drawLine({start:{x:42,y:y+10},end:{x:570,y:y+10},thickness:1,color:rule}); row(balanceDue?`Total payment due (${statementDate(statement.due_at)})`:"Balance due",cash(balanceDue,statement.currency)); y-=44;
  if(payments.length){
    page.drawText("Payment history",{x:42,y,size:18,font:bold,color:ink}); y-=24; page.drawText("Date",{x:42,y,size:9,font:bold,color:ink}); page.drawText("Method",{x:160,y,size:9,font:bold,color:ink}); page.drawText("Reference",{x:300,y,size:9,font:bold,color:ink}); page.drawText("Amount",{x:525,y,size:9,font:bold,color:ink}); y-=18;
    for(const payment of payments){const method=payment.metadata?.paymentMethod||"Card",reference=payment.square_payment_id||"Payment received",value=cash(payment.amount,payment.currency||statement.currency);page.drawLine({start:{x:42,y:y+8},end:{x:570,y:y+8},thickness:.5,color:rule});page.drawText(statementDate(payment.received_at),{x:42,y,size:8,font:regular,color:ink});page.drawText(String(method).slice(0,22),{x:160,y,size:8,font:regular,color:ink});page.drawText(String(reference).slice(0,28),{x:300,y,size:8,font:regular,color:ink});page.drawText(value,{x:570-value.length*4.7,y,size:8,font:regular,color:ink});y-=24;}
    y-=20;
  }
  page.drawText("Transactions",{x:42,y,size:18,font:bold,color:ink}); y-=24; page.drawText("Date",{x:42,y,size:9,font:bold,color:ink}); page.drawText("Details",{x:130,y,size:9,font:bold,color:ink}); page.drawText("Amount",{x:525,y,size:9,font:bold,color:ink}); y-=18;
  for (const entry of entries) {
    const lines = entry.lines?.length ? entry.lines : [{ name:entry.description, amount:entry.amount }];
    const height = Math.max(58, 22 + lines.length*14);
    if (y-height<55) { footer(); addPage(); page.drawText("Transactions",{x:42,y,size:18,font:bold,color:ink}); y-=26; }
    page.drawLine({start:{x:42,y:y+8},end:{x:570,y:y+8},thickness:.5,color:rule}); page.drawText(statementDate(entry.effectiveAt),{x:42,y,size:8,font:regular,color:ink});
    lines.forEach((line,index)=>{ page.drawText(String(line.name).slice(0,66),{x:130,y:y-index*14,size:8,font:regular,color:ink}); const value=cash(line.amount,entry.currency||statement.currency); page.drawText(value,{x:570-value.length*4.7,y:y-index*14,size:8,font:regular,color:ink}); });
    if (entry.reference) page.drawText(`Receipt #${entry.reference}`,{x:130,y:y-lines.length*14,size:8,font:regular,color:rgb(.45,.45,.45)}); y-=height;
  }
  footer(); return Buffer.from(await pdf.save());
}

function hex(value) { const match=value.replace("#","").match(/.{2}/g)||["c9","1b","86"]; return rgb(...match.map((part)=>parseInt(part,16)/255)); }
