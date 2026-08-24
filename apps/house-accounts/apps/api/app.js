import express from "express";
import helmet from "helmet";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { createSession, loadSession, logout, requireStaff, requireUser, verifyPassword } from "./auth.js";
import { accountCredit, postSale, reserveCredit } from "./ledger.js";
import { statementPdf } from "./statements.js";
import { transaction } from "./db.js";

const loginSchema = z.object({ email:z.string().email(), password:z.string().min(8), tenant:z.string().min(2) });
const statementSchema = z.object({ periodStart:z.iso.date(), periodEnd:z.iso.date() });
const accountUpdate = z.object({ status:z.enum(["pending","active","suspended","closed"]), creditLimit:z.number().int().min(0), paymentTermsDays:z.number().int().min(0).max(120) });
const houseOrderSchema = z.object({ accountId:z.uuid(), idempotencyKey:z.string().min(8).max(80), locationId:z.string(), fulfillment:z.record(z.string(),z.unknown()), lineItems:z.array(z.object({ catalog_object_id:z.string(), quantity:z.string(), modifiers:z.array(z.object({ catalog_object_id:z.string() })).optional() })).min(1) });

export function createApp({ pool, square, config }) {
  const app = express();
  app.use(helmet({ contentSecurityPolicy:false }));
  app.use(express.json({ limit:"2mb", verify:(request,_response,buffer)=>{ request.rawBody=buffer; } }));
  app.use(async (request,_response,next)=>{ try { request.user=await loadSession(pool,request); next(); } catch(error){ next(error); } });

  app.get("/api/health", (_request,response)=>response.json({ ok:true, service:"house-account-platform", version:"0.1.0" }));
  app.post("/api/auth/login", async (request,response,next)=>{ try {
    const input=loginSchema.parse(request.body);
    const result=await pool.query(`SELECT u.*,t.id AS tenant_id,t.slug,t.name AS tenant_name,m.role FROM users u JOIN tenant_memberships m ON m.user_id=u.id JOIN tenants t ON t.id=m.tenant_id WHERE lower(u.email)=lower($1) AND t.slug=$2 AND u.status='active' AND m.status='active'`,[input.email,input.tenant]);
    if (!result.rowCount || !(await verifyPassword(input.password,result.rows[0].password_hash))) throw Object.assign(new Error("Email or password is incorrect."),{status:401,code:"INVALID_LOGIN"});
    await createSession(pool,response,result.rows[0].id,result.rows[0].tenant_id,config.secureCookies);
    response.json({ user:publicUser(result.rows[0]) });
  } catch(error){ next(error); }});
  app.get("/api/auth/session", (request,response)=>response.json({ user:request.user ? publicUser(request.user) : null }));
  app.post("/api/auth/logout", async (request,response,next)=>{ try { await logout(pool,request,response,config.secureCookies); response.status(204).end(); } catch(error){ next(error); } });

  app.get("/api/portal/account", async (request,response,next)=>{ try {
    const user=requireUser(request);
    const membership=await pool.query(`SELECT a.* FROM account_users au JOIN accounts a ON a.id=au.account_id WHERE au.user_id=$1 AND a.tenant_id=$2 AND au.status='active' LIMIT 1`,[user.id,user.tenant_id]);
    if (!membership.rowCount) return response.json({ account:null });
    response.json({ account:await hydrateAccount(pool,membership.rows[0]) });
  } catch(error){ next(error); }});

  app.get("/api/admin/accounts", async (request,response,next)=>{ try {
    const user=requireStaff(request);
    const accounts=await pool.query("SELECT * FROM accounts WHERE tenant_id=$1 ORDER BY created_at DESC",[user.tenant_id]);
    response.json({ accounts:await Promise.all(accounts.rows.map((account)=>hydrateAccount(pool,account))) });
  } catch(error){ next(error); }});
  app.patch("/api/admin/accounts/:id", async (request,response,next)=>{ try {
    const user=requireStaff(request), input=accountUpdate.parse(request.body);
    const before=await pool.query("SELECT * FROM accounts WHERE id=$1 AND tenant_id=$2",[request.params.id,user.tenant_id]);
    if (!before.rowCount) throw Object.assign(new Error("Account not found."),{status:404});
    const result=await pool.query(`UPDATE accounts SET status=$3,credit_limit=$4,payment_terms_days=$5,approved_at=CASE WHEN $3='active' AND approved_at IS NULL THEN now() ELSE approved_at END,updated_at=now() WHERE id=$1 AND tenant_id=$2 RETURNING *`,[request.params.id,user.tenant_id,input.status,input.creditLimit,input.paymentTermsDays]);
    await audit(pool,user,request,"account.updated","account",request.params.id,before.rows[0],result.rows[0]); response.json({ account:result.rows[0] });
  } catch(error){ next(error); }});

  app.post("/api/admin/accounts/:id/statements", async (request,response,next)=>{ try {
    const user=requireStaff(request), input=statementSchema.parse(request.body);
    if (input.periodEnd<input.periodStart) throw Object.assign(new Error("Statement end must follow its start."),{status:400});
    const statement=await issueStatement(pool,user,request.params.id,input); await audit(pool,user,request,"statement.issued","statement",statement.id,null,statement); response.status(201).json({ statement });
  } catch(error){ next(error); }});
  app.get("/api/statements/:id.pdf", async (request,response,next)=>{ try {
    const user=requireUser(request);
    const result=await pool.query(`SELECT s.*,a.organization_name,a.billing_contact,t.name AS tenant_name,t.brand FROM statements s JOIN accounts a ON a.id=s.account_id JOIN tenants t ON t.id=s.tenant_id LEFT JOIN account_users au ON au.account_id=a.id AND au.user_id=$2 WHERE s.id=$1 AND s.tenant_id=$3 AND ($4::boolean OR au.user_id IS NOT NULL)`,[request.params.id,user.id,user.tenant_id,["owner","staff"].includes(user.role)]);
    if (!result.rowCount) throw Object.assign(new Error("Statement not found."),{status:404});
    const row=result.rows[0], pdf=await statementPdf(row,{name:row.tenant_name,brand:row.brand},{organization_name:row.organization_name,billing_contact:row.billing_contact});
    response.set({"Content-Type":"application/pdf","Content-Disposition":`inline; filename="${row.statement_number}.pdf"`,"Cache-Control":"private, no-store"}).send(pdf);
  } catch(error){ next(error); }});

  app.post("/api/orders/house-account", async (request,response,next)=>{ try {
    const user=requireUser(request), input=houseOrderSchema.parse(request.body);
    const tenantSquare=typeof square.forTenant==="function"?await square.forTenant(user.tenant_id):square;
    const accountResult=await pool.query("SELECT * FROM accounts WHERE id=$1 AND tenant_id=$2 AND status='active'",[input.accountId,user.tenant_id]);
    if (!accountResult.rowCount) throw Object.assign(new Error("An active house account is required."),{status:403});
    const calculated=await tenantSquare.request("/v2/orders/calculate",{method:"POST",body:{order:{location_id:input.locationId,line_items:input.lineItems,fulfillments:[input.fulfillment],customer_id:accountResult.rows[0].square_customer_id}}});
    const amount=Number(calculated.order.total_money.amount); await reserveCredit(pool,{accountId:input.accountId,amount,idempotencyKey:input.idempotencyKey});
    const created=await tenantSquare.createOrder({idempotency_key:`order-${input.idempotencyKey}`,order:{location_id:input.locationId,line_items:input.lineItems,fulfillments:[input.fulfillment],customer_id:accountResult.rows[0].square_customer_id,source:{name:"House Account Portal"}}});
    const payment=await tenantSquare.createPayment({idempotency_key:`payment-${input.idempotencyKey}`,source_id:"EXTERNAL",amount_money:created.order.total_money,order_id:created.order.id,location_id:input.locationId,customer_id:accountResult.rows[0].square_customer_id,autocomplete:true,external_details:{type:"OTHER",source:"Online House Account"}});
    await transaction(pool,async(client)=>{ await client.query(`INSERT INTO orders(tenant_id,account_id,square_order_id,square_payment_id,square_customer_id,source,status,location_id,subtotal,tax,total,currency,ordered_at,fulfillment,line_items,raw_square) VALUES($1,$2,$3,$4,$5,'online','posted',$6,$7,$8,$9,$10,now(),$11,$12,$13) ON CONFLICT(tenant_id,square_order_id) DO NOTHING`,[user.tenant_id,input.accountId,created.order.id,payment.payment.id,accountResult.rows[0].square_customer_id,input.locationId,Number(created.order.total_money.amount)-Number(created.order.total_tax_money?.amount||0),Number(created.order.total_tax_money?.amount||0),Number(created.order.total_money.amount),created.order.total_money.currency,JSON.stringify(input.fulfillment),JSON.stringify(input.lineItems),JSON.stringify({order:created.order,payment:payment.payment})]); await postSale(client,{tenantId:user.tenant_id,accountId:input.accountId,orderId:created.order.id,amount:Number(created.order.total_money.amount),currency:created.order.total_money.currency,description:`Online order ${created.order.id}`,actorId:user.id}); await client.query("UPDATE credit_reservations SET status='captured',updated_at=now() WHERE idempotency_key=$1",[input.idempotencyKey]); });
    response.status(201).json({ orderId:created.order.id,paymentId:payment.payment.id,totalMoney:created.order.total_money });
  } catch(error){ next(error); }});

  app.post("/api/webhooks/square", async (request,response,next)=>{ try {
    const event=request.body; if (!event?.event_id) throw Object.assign(new Error("Square event ID is required."),{status:400});
    const tenant=await pool.query("SELECT id FROM tenants WHERE square_merchant_id=$1 LIMIT 1",[event.merchant_id]);
    await pool.query(`INSERT INTO webhook_events(tenant_id,provider_event_id,event_type,payload,status) VALUES($1,$2,$3,$4,$5) ON CONFLICT(provider,provider_event_id) DO NOTHING`,[tenant.rows[0]?.id||null,event.event_id,event.type,JSON.stringify(event),tenant.rowCount?"pending":"review"]); response.status(202).json({accepted:true});
  } catch(error){ next(error); }});

  app.use((error,_request,response,_next)=>{ const status=error.status||500; if(status>=500) console.error(error); response.status(status).json({ error:{ code:error.code||"REQUEST_FAILED",message:status>=500?"The account service is temporarily unavailable.":error.message,...(status<500&&error.details?{details:error.details}:{}),...(status<500&&error.issues?{details:error.issues}:{}) } }); });
  return app;
}

const publicUser=(row)=>({id:row.id,email:row.email,firstName:row.first_name,lastName:row.last_name,role:row.role,tenantId:row.tenant_id,tenantSlug:row.tenant_slug||row.slug,tenantName:row.tenant_name});

async function hydrateAccount(pool,account) {
  const [credit,orders,ledger,statements,payments]=await Promise.all([accountCredit(pool,account.id),pool.query("SELECT * FROM orders WHERE account_id=$1 ORDER BY ordered_at DESC LIMIT 50",[account.id]),pool.query(`SELECT jt.id,jt.transaction_type,jt.description,jt.effective_at,jp.amount,jp.currency FROM journal_transactions jt JOIN journal_postings jp ON jp.transaction_id=jt.id WHERE jt.account_id=$1 AND jp.ledger_account='accounts_receivable' ORDER BY jt.effective_at DESC LIMIT 100`,[account.id]),pool.query("SELECT id,statement_number,period_start,period_end,due_at,closing_balance,currency,status FROM statements WHERE account_id=$1 ORDER BY period_end DESC LIMIT 30",[account.id]),pool.query("SELECT * FROM payment_allocations WHERE account_id=$1 ORDER BY created_at DESC LIMIT 30",[account.id])]);
  return {...account,credit,orders:orders.rows,ledger:ledger.rows,statements:statements.rows,payments:payments.rows};
}

async function issueStatement(pool,user,accountId,input) {
  const account=await pool.query("SELECT * FROM accounts WHERE id=$1 AND tenant_id=$2",[accountId,user.tenant_id]); if(!account.rowCount) throw Object.assign(new Error("Account not found."),{status:404});
  const [opening,entries]=await Promise.all([pool.query(`SELECT COALESCE(SUM(jp.amount),0)::bigint AS total FROM journal_postings jp JOIN journal_transactions jt ON jt.id=jp.transaction_id WHERE jp.account_id=$1 AND jp.ledger_account='accounts_receivable' AND jt.effective_at<$2::date`,[accountId,input.periodStart]),pool.query(`SELECT jt.id,jt.transaction_type,jt.description,jt.effective_at,jt.source_id,jp.amount,jp.currency,o.line_items,o.tax,o.receipt_number FROM journal_transactions jt JOIN journal_postings jp ON jp.transaction_id=jt.id LEFT JOIN orders o ON o.square_order_id=jt.source_id AND o.account_id=jt.account_id WHERE jp.account_id=$1 AND jp.ledger_account='accounts_receivable' AND jt.effective_at>=$2::date AND jt.effective_at<($3::date+1) ORDER BY jt.effective_at,jt.created_at`,[accountId,input.periodStart,input.periodEnd])]);
  const openingBalance=Number(opening.rows[0].total),charges=entries.rows.filter(e=>Number(e.amount)>0).reduce((s,e)=>s+Number(e.amount),0),credits=entries.rows.filter(e=>Number(e.amount)<0).reduce((s,e)=>s+Math.abs(Number(e.amount)),0),closing=openingBalance+charges-credits;
  const statementNumber=`${account.rows[0].account_code_hint||"HA"}-${input.periodEnd.replaceAll("-","")}-${randomUUID().slice(0,4).toUpperCase()}`;
  const snapshot={organizationName:account.rows[0].organization_name,billingContact:account.rows[0].billing_contact,entries:entries.rows.map(e=>{const itemLines=e.line_items?.map(i=>({name:`${i.name||i.catalog_object_id} x ${i.quantity}`,amount:Number(i.total_money?.amount||Number(i.base_price_money?.amount||0)*Number(i.quantity))}))||[];return {effectiveAt:e.effective_at,description:e.description,amount:Number(e.amount),currency:e.currency,reference:e.receipt_number||e.source_id,lines:itemLines.length?[...itemLines,...(Number(e.tax)?[{name:"Taxes & Fees",amount:Number(e.tax)}]:[]),{name:"Total",amount:Number(e.amount)}]:undefined};})};
  return (await pool.query(`INSERT INTO statements(tenant_id,account_id,statement_number,period_start,period_end,due_at,opening_balance,new_charges,credits_and_payments,closing_balance,currency,status,snapshot,issued_at) VALUES($1,$2,$3,$4,$5,($5::date+$6::int),$7,$8,$9,$10,$11,'issued',$12,now()) RETURNING *`,[user.tenant_id,accountId,statementNumber,input.periodStart,input.periodEnd,account.rows[0].payment_terms_days,openingBalance,charges,credits,Math.max(0,closing),account.rows[0].currency,JSON.stringify(snapshot)])).rows[0];
}

async function audit(pool,user,request,action,targetType,targetId,before,after){ await pool.query(`INSERT INTO audit_log(tenant_id,actor_user_id,action,target_type,target_id,before_state,after_state,ip_address,user_agent) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[user.tenant_id,user.id,action,targetType,targetId,before?JSON.stringify(before):null,after?JSON.stringify(after):null,request.ip,request.get("user-agent")]); }
