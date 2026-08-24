import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const cash = (amount, currency="CAD") => new Intl.NumberFormat("en-CA", { style:"currency", currency }).format(Number(amount)/100);
const date = (value) => new Date(`${String(value).slice(0,10)}T12:00:00Z`).toLocaleDateString("en-CA", { year:"numeric", month:"short", day:"numeric" });

export async function statementPdf(statement, tenant, account) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(23/255,57/255,74/255), accent = hex(tenant.brand?.accent || "#c91b86"), rule = rgb(.76,.78,.79);
  const entries = statement.snapshot.entries || [];
  let page, y, pageNumber = 0;
  const addPage = () => {
    page = pdf.addPage([612,792]); pageNumber += 1; y = 740;
    page.drawText(tenant.name,{x:42,y,size:14,font:bold,color:ink}); page.drawLine({start:{x:42,y:y-22},end:{x:570,y:y-22},thickness:2,color:accent}); y-=58;
    if (pageNumber>1) { page.drawText(`${account.billing_contact}  ·  ${account.organization_name}  ·  ${date(statement.period_start)} - ${date(statement.period_end)}`,{x:42,y,size:8,font:regular,color:ink}); y-=36; }
  };
  const footer = () => page.drawText(`Page ${pageNumber}`,{x:520,y:28,size:8,font:regular,color:rgb(.45,.45,.45)});
  const row = (label,value,top=y) => { page.drawText(label,{x:42,y:top,size:10,font:regular,color:ink}); page.drawText(value,{x:570-(value.length*5.7),y:top,size:10,font:bold,color:ink}); };
  addPage();
  page.drawText("Account details",{x:42,y,size:18,font:bold,color:ink}); y-=28;
  const columns = [["Bill to",`${account.billing_contact}\n${account.organization_name}`],["Invoice period",`${date(statement.period_start)} - ${date(statement.period_end)}`],["Last payment",statement.snapshot.lastPayment ? date(statement.snapshot.lastPayment) : "N/A"],["Payment due",`${cash(statement.closing_balance,statement.currency)}\nDue ${date(statement.due_at)}`]];
  columns.forEach(([label,value],index)=>{ const x=42+index*132; page.drawText(label,{x,y,size:8,font:bold,color:rgb(.35,.35,.35)}); value.split("\n").forEach((line,i)=>page.drawText(line,{x,y:y-15-i*13,size:8,font:regular,color:ink})); });
  y-=84; page.drawText("Account statement summary",{x:42,y,size:18,font:bold,color:ink}); y-=32;
  row("Opening balance",cash(statement.opening_balance,statement.currency)); y-=18; row("New charges",cash(statement.new_charges,statement.currency)); y-=18; row("Credits and payments",`-${cash(statement.credits_and_payments,statement.currency)}`); y-=22;
  page.drawLine({start:{x:42,y:y+10},end:{x:570,y:y+10},thickness:1,color:rule}); row(`Total payment due (${date(statement.due_at)})`,cash(statement.closing_balance,statement.currency)); y-=52;
  page.drawText("Transactions",{x:42,y,size:18,font:bold,color:ink}); y-=24; page.drawText("Date",{x:42,y,size:9,font:bold,color:ink}); page.drawText("Details",{x:130,y,size:9,font:bold,color:ink}); page.drawText("Amount",{x:525,y,size:9,font:bold,color:ink}); y-=18;
  for (const entry of entries) {
    const lines = entry.lines?.length ? entry.lines : [{ name:entry.description, amount:entry.amount }];
    const height = Math.max(58, 22 + lines.length*14);
    if (y-height<55) { footer(); addPage(); page.drawText("Transactions",{x:42,y,size:18,font:bold,color:ink}); y-=26; }
    page.drawLine({start:{x:42,y:y+8},end:{x:570,y:y+8},thickness:.5,color:rule}); page.drawText(date(entry.effectiveAt),{x:42,y,size:8,font:regular,color:ink});
    lines.forEach((line,index)=>{ page.drawText(String(line.name).slice(0,66),{x:130,y:y-index*14,size:8,font:regular,color:ink}); const value=cash(line.amount,entry.currency||statement.currency); page.drawText(value,{x:570-value.length*4.7,y:y-index*14,size:8,font:regular,color:ink}); });
    if (entry.reference) page.drawText(`Receipt #${entry.reference}`,{x:130,y:y-lines.length*14,size:8,font:regular,color:rgb(.45,.45,.45)}); y-=height;
  }
  footer(); return Buffer.from(await pdf.save());
}

function hex(value) { const match=value.replace("#","").match(/.{2}/g)||["c9","1b","86"]; return rgb(...match.map((part)=>parseInt(part,16)/255)); }
