import express from "express";
import helmet from "helmet";
import nodemailer from "nodemailer";
import { z } from "zod";
import { randomBytes, randomUUID } from "node:crypto";
import { createSession, hashPassword, loadSession, logout, requireStaff, requireUser, verifyPassword } from "./auth.js";
import { accountCredit, postPayment, postSale, reserveCredit } from "./ledger.js";
import { processNextSquareEvent } from "../worker/process-square.js";
import { statementPdf } from "./statements.js";
import { transaction } from "./db.js";
import { deliveryFee, deliveryServiceCharge, merchandiseSubtotal, validateDelivery } from "./delivery.js";

const loginSchema = z.object({ email:z.string().email(), password:z.string().min(8), tenant:z.string().min(2) });
const statementSchema = z.object({ periodStart:z.iso.date(), periodEnd:z.iso.date() });
const accountUpdate = z.object({ status:z.enum(["pending","active","suspended","closed"]), creditLimit:z.number().int().min(0), paymentTermsDays:z.number().int().min(0).max(120) });
const houseOrderSchema = z.object({ accountId:z.uuid(), idempotencyKey:z.string().min(8).max(80), locationId:z.string(), fulfillment:z.record(z.string(),z.unknown()), lineItems:z.array(z.object({ catalog_object_id:z.string(), quantity:z.string(), modifiers:z.array(z.object({ catalog_object_id:z.string() })).optional() })).min(1) });
const applicationSchema=z.object({tenantSlug:z.string().min(2).default("amazing-donuts"),organizationName:z.string().trim().min(2).max(160),organizationType:z.string().trim().min(2).max(80),contactName:z.string().trim().min(2).max(120),email:z.string().email(),phone:z.string().trim().max(40).optional().default(""),headCount:z.string().trim().max(40).optional().default(""),neededFor:z.iso.date(),fulfillment:z.string().trim().min(2).max(40),products:z.array(z.string().trim().min(1).max(80)).min(1).max(20),notes:z.string().trim().max(3000).optional().default(""),website:z.string().max(0).optional().default("")});
const houseApplicationSchema=z.object({organizationName:z.string().trim().min(2).max(160),organizationType:z.string().trim().min(2).max(80),phone:z.string().trim().max(40).optional().default(""),notes:z.string().trim().max(3000).optional().default("")});
const applicationReviewSchema=z.object({status:z.enum(["approved","rejected"]),reviewNotes:z.string().trim().max(2000).optional().default(""),creditLimit:z.number().int().min(0).max(100000000).default(0),paymentTermsDays:z.number().int().min(0).max(120).default(30)});
const bulkReviewSchema=z.object({status:z.enum(["approved","rejected"]),reviewNotes:z.string().trim().max(2000).optional().default("")});
const registerSchema=z.object({tenantSlug:z.string().min(2).default("amazing-donuts"),firstName:z.string().trim().min(1).max(80),lastName:z.string().trim().min(1).max(80),email:z.string().email(),phone:z.string().trim().max(40).optional().default(""),password:z.string().min(8).max(200)});
const cartSchema=z.array(z.object({name:z.string().trim().min(1).max(180),quantity:z.number().int().min(1).max(99)})).min(1).max(60);
const fulfillmentSchema=z.object({type:z.enum(["pickup","delivery"]),scheduledAt:z.iso.datetime(),recipient:z.object({displayName:z.string().trim().min(2).max(120),email:z.string().email(),phone:z.string().trim().min(7).max(40)}),address:z.object({addressLine1:z.string().trim().min(2).max(180),addressLine2:z.string().trim().max(180).optional().default(""),locality:z.string().trim().min(2).max(100),administrativeDistrictLevel1:z.string().trim().min(2).max(80).default("ON"),postalCode:z.string().trim().min(3).max(20),country:z.string().trim().length(2).default("CA")}).optional(),deliveryInstructions:z.string().trim().max(500).optional().default(""),noContact:z.boolean().optional().default(false)}).superRefine((value,context)=>{if(value.type==="delivery"&&!value.address)context.addIssue({code:"custom",path:["address"],message:"A delivery address is required."});});
const artworkSchema=z.object({assetId:z.uuid(),count:z.number().int().min(1).max(99)});
const customizationsSchema=z.array(z.discriminatedUnion("kind",[z.object({productName:z.string().min(1).max(180),kind:z.literal("print"),icingFlavor:z.enum(["Chocolate","Vanilla"]),sprinkleColours:z.string().trim().max(120).default(""),artworks:z.array(artworkSchema).min(1).max(99)}),z.object({productName:z.string().min(1).max(180),kind:z.literal("glyph"),glyph:z.string().trim().min(1).max(120)})])).max(20).default([]);
const checkoutSchema=z.object({idempotencyKey:z.uuid(),items:cartSchema,customizations:customizationsSchema,fulfillment:fulfillmentSchema,paymentMethod:z.enum(["card","house_account"]),sourceId:z.string().min(6).max(300).optional()});
const uploadSchema=z.object({fileName:z.string().trim().min(1).max(180),dataUrl:z.string().max(1900000)});
const profileSchema=z.object({firstName:z.string().trim().min(1).max(80),lastName:z.string().trim().min(1).max(80),phone:z.string().trim().max(40).optional().default(""),address:z.record(z.string(),z.string()).optional().default({})});
const settlementSchema=z.object({sourceId:z.string().min(6).max(300),idempotencyKey:z.uuid()});

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

  app.post("/api/storefront/register",async(request,response,next)=>{try{
    const input=registerSchema.parse(request.body),tenant=await pool.query("SELECT * FROM tenants WHERE slug=$1 AND status='active'",[input.tenantSlug]);
    if(!tenant.rowCount) throw Object.assign(new Error("Online accounts are unavailable."),{status:404});
    const exists=await pool.query("SELECT id FROM users WHERE lower(email)=lower($1)",[input.email]);
    if(exists.rowCount) throw Object.assign(new Error("An account already exists for this email. Please sign in."),{status:409,code:"EMAIL_EXISTS"});
    const tenantSquare=typeof square.forTenant==="function"?await square.forTenant(tenant.rows[0].id):square;
    const customer=await tenantSquare.createCustomer({idempotency_key:`storefront-${randomUUID()}`,given_name:input.firstName,family_name:input.lastName,email_address:input.email.toLowerCase(),phone_number:input.phone||undefined});
    const passwordHash=await hashPassword(input.password);
    const user=await transaction(pool,async client=>{
      const created=(await client.query("INSERT INTO users(email,password_hash,first_name,last_name,phone) VALUES(lower($1),$2,$3,$4,$5) RETURNING *",[input.email,passwordHash,input.firstName,input.lastName,input.phone||null])).rows[0];
      await client.query("INSERT INTO tenant_memberships(tenant_id,user_id,role) VALUES($1,$2,'viewer')",[tenant.rows[0].id,created.id]);
      await client.query("INSERT INTO customer_profiles(tenant_id,user_id,square_customer_id,default_phone) VALUES($1,$2,$3,$4)",[tenant.rows[0].id,created.id,customer.customer.id,input.phone||null]);
      const house=await client.query("SELECT id FROM accounts WHERE tenant_id=$1 AND lower(billing_email)=lower($2) AND status IN ('pending','active') ORDER BY created_at DESC LIMIT 1",[tenant.rows[0].id,input.email]);
      if(house.rowCount) await client.query("INSERT INTO account_users(account_id,user_id,role) VALUES($1,$2,'account_admin') ON CONFLICT DO NOTHING",[house.rows[0].id,created.id]);
      return {...created,tenant_id:tenant.rows[0].id,slug:tenant.rows[0].slug,tenant_name:tenant.rows[0].name,role:"viewer"};
    });
    await createSession(pool,response,user.id,user.tenant_id,config.secureCookies);response.status(201).json({user:publicUser(user)});
  }catch(error){next(error);}});
  app.get("/api/storefront/session",async(request,response,next)=>{try{
    if(!request.user)return response.json({user:null,profile:null,houseAccount:null});
    const [profile,house]=await Promise.all([pool.query("SELECT cp.*,u.first_name,u.last_name,u.email,u.phone FROM customer_profiles cp JOIN users u ON u.id=cp.user_id WHERE cp.tenant_id=$1 AND cp.user_id=$2",[request.user.tenant_id,request.user.id]),pool.query("SELECT a.* FROM account_users au JOIN accounts a ON a.id=au.account_id WHERE au.user_id=$1 AND a.tenant_id=$2 AND au.status='active' ORDER BY a.created_at DESC LIMIT 1",[request.user.id,request.user.tenant_id])]);
    response.json({user:publicUser(request.user),profile:profile.rows[0]||null,houseAccount:house.rowCount?{id:house.rows[0].id,organizationName:house.rows[0].organization_name,status:house.rows[0].status,credit:await accountCredit(pool,house.rows[0].id)}:null});
  }catch(error){next(error);}});
  app.patch("/api/storefront/profile",async(request,response,next)=>{try{
    const user=requireUser(request),input=profileSchema.parse(request.body);
    await transaction(pool,async client=>{await client.query("UPDATE users SET first_name=$3,last_name=$4,phone=$5 WHERE id=$1 AND EXISTS(SELECT 1 FROM tenant_memberships WHERE tenant_id=$2 AND user_id=$1)",[user.id,user.tenant_id,input.firstName,input.lastName,input.phone||null]);await client.query("UPDATE customer_profiles SET default_phone=$3,default_address=$4,updated_at=now() WHERE tenant_id=$1 AND user_id=$2",[user.tenant_id,user.id,input.phone||null,JSON.stringify(input.address)]);});
    response.json({ok:true});
  }catch(error){next(error);}});
  app.get("/api/storefront/house-application",async(request,response,next)=>{try{const user=requireUser(request),result=await pool.query("SELECT * FROM house_account_applications WHERE tenant_id=$1 AND user_id=$2 LIMIT 1",[user.tenant_id,user.id]);response.json({application:result.rows[0]||null});}catch(error){next(error);}});
  app.post("/api/storefront/house-application",async(request,response,next)=>{try{
    const user=requireUser(request),input=houseApplicationSchema.parse(request.body);
    const linked=await pool.query("SELECT 1 FROM account_users au JOIN accounts a ON a.id=au.account_id WHERE au.user_id=$1 AND a.tenant_id=$2 AND a.status IN ('pending','active')",[user.id,user.tenant_id]);
    if(linked.rowCount)throw Object.assign(new Error("This login already has a house account."),{status:409,code:"HOUSE_ACCOUNT_EXISTS"});
    const existing=await pool.query("SELECT status FROM house_account_applications WHERE tenant_id=$1 AND user_id=$2",[user.tenant_id,user.id]);
    if(existing.rowCount)throw Object.assign(new Error("A house-account application is already on file."),{status:409,code:"HOUSE_APPLICATION_EXISTS"});
    const result=await pool.query(`INSERT INTO house_account_applications(tenant_id,user_id,organization_name,organization_type,contact_name,email,phone,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[user.tenant_id,user.id,input.organizationName,input.organizationType,`${user.first_name} ${user.last_name}`.trim(),user.email,input.phone||user.phone||null,input.notes||null]);
    response.status(201).json({application:result.rows[0]});
  }catch(error){next(error);}});
  app.get("/api/storefront/config",(_request,response)=>response.json({environment:config.squareEnvironment,applicationId:config.squareApplicationId,locationId:config.squareLocationId,currency:"CAD",delivery:{enabled:config.delivery.enabled,postalPrefixes:config.delivery.postalPrefixes,minimumAmount:config.delivery.minimumAmount,feeAmount:config.delivery.feeAmount,freeThreshold:config.delivery.freeThreshold,provider:config.delivery.provider}}));
  app.post("/api/storefront/custom-assets",async(request,response,next)=>{try{const user=requireUser(request),input=uploadSchema.parse(request.body),match=input.dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);if(!match)throw Object.assign(new Error("The artwork must be a JPEG, PNG, or WebP image."),{status:400});const bytes=Buffer.from(match[2],"base64");if(bytes.length>1400000)throw Object.assign(new Error("The artwork file is too large."),{status:413});const asset=(await pool.query("INSERT INTO custom_order_assets(tenant_id,user_id,file_name,mime_type,file_data) VALUES($1,$2,$3,$4,$5) RETURNING id,file_name,mime_type",[user.tenant_id,user.id,input.fileName,match[1],bytes])).rows[0];response.status(201).json({asset});}catch(error){next(error);}});
  app.get("/api/custom-assets/:id",async(request,response,next)=>{try{const user=requireUser(request),staff=["owner","staff"].includes(user.role),result=await pool.query("SELECT * FROM custom_order_assets WHERE id=$1 AND tenant_id=$2 AND ($3::boolean OR user_id=$4)",[request.params.id,user.tenant_id,staff,user.id]);if(!result.rowCount)throw Object.assign(new Error("Artwork not found."),{status:404});const asset=result.rows[0];response.set({"Content-Type":asset.mime_type,"Content-Disposition":`attachment; filename="${String(asset.file_name).replace(/[\"\r\n]/g,"")}"`,"Cache-Control":"private, no-store"}).send(asset.file_data);}catch(error){next(error);}});
  app.post("/api/storefront/quote",async(request,response,next)=>{try{const user=requireUser(request),input=z.object({items:cartSchema,fulfillment:fulfillmentSchema}).parse(request.body),tenantSquare=typeof square.forTenant==="function"?await square.forTenant(user.tenant_id):square,{calculated}=await prepareSquareOrder(tenantSquare,config,input,user);response.json({order:publicOrder(calculated),delivery:publicDelivery(calculated,input,config.delivery)});}catch(error){next(error);}});
  app.post("/api/storefront/checkout",async(request,response,next)=>{try{
    const user=requireUser(request),input=checkoutSchema.parse(request.body),tenantSquare=typeof square.forTenant==="function"?await square.forTenant(user.tenant_id):square;
    const customerProfile=await pool.query("SELECT square_customer_id FROM customer_profiles WHERE tenant_id=$1 AND user_id=$2",[user.tenant_id,user.id]);
    if(!customerProfile.rowCount)throw Object.assign(new Error("A storefront customer profile is required to checkout."),{status:403});
    if(input.paymentMethod==="card"&&!input.sourceId)throw Object.assign(new Error("Card authorization is required."),{status:400});
    const assetIds=input.customizations.flatMap(item=>item.kind==="print"?item.artworks.map(art=>art.assetId):[]);if(assetIds.length){const owned=await pool.query("SELECT id FROM custom_order_assets WHERE tenant_id=$1 AND user_id=$2 AND storefront_order_id IS NULL AND id=ANY($3::uuid[])",[user.tenant_id,user.id,assetIds]);if(owned.rowCount!==new Set(assetIds).size)throw Object.assign(new Error("One or more artwork files are unavailable. Please upload them again."),{status:409});}
    const {orderDraft,calculated}=await prepareSquareOrder(tenantSquare,config,input,user);
    let account=null,customerId=customerProfile.rows[0].square_customer_id;if(input.paymentMethod==="house_account"){const result=await pool.query("SELECT a.* FROM account_users au JOIN accounts a ON a.id=au.account_id WHERE au.user_id=$1 AND a.tenant_id=$2 AND au.status='active' AND a.status='active' LIMIT 1",[user.id,user.tenant_id]);if(!result.rowCount)throw Object.assign(new Error("An active house account is required."),{status:403});account=result.rows[0];customerId=account.square_customer_id;await reserveCredit(pool,{accountId:account.id,amount:Number(calculated.total_money.amount),idempotencyKey:input.idempotencyKey});}
    const created=(await tenantSquare.createOrder({idempotency_key:`order-${input.idempotencyKey}`,order:{...orderDraft,customer_id:customerId}})).order;
    const payment=(await tenantSquare.createPayment({idempotency_key:`payment-${input.idempotencyKey}`,source_id:input.paymentMethod==="house_account"?"EXTERNAL":input.sourceId,amount_money:created.total_money,order_id:created.id,location_id:config.squareLocationId,customer_id:customerId,autocomplete:true,...(input.paymentMethod==="house_account"?{external_details:{type:"OTHER",source:"Online House Account"}}:{})})).payment;
    await transaction(pool,async client=>{
      const stored=(await client.query(`INSERT INTO storefront_orders(tenant_id,user_id,account_id,square_order_id,square_payment_id,payment_method,status,subtotal,tax,total,currency,fulfillment,line_items,customizations,raw_square) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) ON CONFLICT(tenant_id,square_order_id) DO UPDATE SET customizations=EXCLUDED.customizations RETURNING id`,[user.tenant_id,user.id,account?.id||null,created.id,payment.id,input.paymentMethod,payment.status?.toLowerCase()||"completed",Number(created.total_money.amount)-Number(created.total_tax_money?.amount||0),Number(created.total_tax_money?.amount||0),Number(created.total_money.amount),created.total_money.currency,JSON.stringify(input.fulfillment),JSON.stringify(created.line_items||[]),JSON.stringify(input.customizations),JSON.stringify({order:created,payment})])).rows[0];
      if(assetIds.length)await client.query("UPDATE custom_order_assets SET storefront_order_id=$1 WHERE tenant_id=$2 AND user_id=$3 AND id=ANY($4::uuid[])",[stored.id,user.tenant_id,user.id,assetIds]);
      if(account){await client.query(`INSERT INTO orders(tenant_id,account_id,square_order_id,square_payment_id,square_customer_id,source,status,location_id,subtotal,tax,total,currency,ordered_at,fulfillment,line_items,raw_square) VALUES($1,$2,$3,$4,$5,'online','posted',$6,$7,$8,$9,$10,now(),$11,$12,$13) ON CONFLICT(tenant_id,square_order_id) DO NOTHING`,[user.tenant_id,account.id,created.id,payment.id,account.square_customer_id,config.squareLocationId,Number(created.total_money.amount)-Number(created.total_tax_money?.amount||0),Number(created.total_tax_money?.amount||0),Number(created.total_money.amount),created.total_money.currency,JSON.stringify(input.fulfillment),JSON.stringify(created.line_items||[]),JSON.stringify({order:created,payment})]);await postSale(client,{tenantId:user.tenant_id,accountId:account.id,orderId:created.id,amount:Number(created.total_money.amount),currency:created.total_money.currency,description:`Online order ${created.id}`,actorId:user.id});await client.query("UPDATE credit_reservations SET status='captured',updated_at=now() WHERE idempotency_key=$1",[input.idempotencyKey]);}
    });response.status(201).json({order:publicOrder(created),paymentMethod:input.paymentMethod,delivery:publicDelivery(created,input,config.delivery)});
  }catch(error){next(error);}});
  app.get("/api/storefront/orders",async(request,response,next)=>{try{const user=requireUser(request),result=await pool.query(`SELECT id,square_order_id,payment_method,status,subtotal,tax,total,currency,fulfillment,line_items,ordered_at FROM storefront_orders WHERE tenant_id=$1 AND user_id=$2 UNION ALL SELECT o.id,o.square_order_id,'house_account' AS payment_method,o.status,o.subtotal,o.tax,o.total,o.currency,o.fulfillment,o.line_items,o.ordered_at FROM orders o JOIN account_users au ON au.account_id=o.account_id AND au.user_id=$2 WHERE o.tenant_id=$1 AND NOT EXISTS(SELECT 1 FROM storefront_orders so WHERE so.tenant_id=o.tenant_id AND so.square_order_id=o.square_order_id) ORDER BY ordered_at DESC LIMIT 100`,[user.tenant_id,user.id]);response.json({orders:result.rows});}catch(error){next(error);}});

  app.post("/api/public/bulk-requests", async (request,response,next)=>{ try {
    const input=applicationSchema.parse(request.body),tenant=await pool.query("SELECT id FROM tenants WHERE slug=$1 AND status='active'",[input.tenantSlug]);
    if(!tenant.rowCount) throw Object.assign(new Error("This ordering program is unavailable."),{status:404});
    const recent=await pool.query("SELECT id FROM applications WHERE tenant_id=$1 AND lower(email)=lower($2) AND created_at>now()-interval '2 minutes'",[tenant.rows[0].id,input.email]);
    if(recent.rowCount) throw Object.assign(new Error("We already received this request. The team will review it shortly."),{status:409,code:"DUPLICATE_APPLICATION"});
    const result=await pool.query(`INSERT INTO applications(tenant_id,organization_name,organization_type,contact_name,email,phone,head_count,needed_for,fulfillment,products,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id,status,created_at`,[tenant.rows[0].id,input.organizationName,input.organizationType,input.contactName,input.email.toLowerCase(),input.phone||null,input.headCount||null,input.neededFor,input.fulfillment,JSON.stringify(input.products),input.notes||null]);
    response.status(201).json({application:result.rows[0]});
  } catch(error){next(error);}});

  app.get("/api/portal/account", async (request,response,next)=>{ try {
    const user=requireUser(request);
    const membership=await pool.query(`SELECT a.* FROM account_users au JOIN accounts a ON a.id=au.account_id WHERE au.user_id=$1 AND a.tenant_id=$2 AND au.status='active' LIMIT 1`,[user.id,user.tenant_id]);
    if (!membership.rowCount) return response.json({ account:null });
    response.json({ account:await hydrateAccount(pool,membership.rows[0]) });
  } catch(error){ next(error); }});

  app.post("/api/storefront/statements/:id/pay",async(request,response,next)=>{try{
    const user=requireUser(request),input=settlementSchema.parse(request.body);
    const result=await pool.query(`SELECT s.*,a.square_customer_id FROM statements s JOIN accounts a ON a.id=s.account_id JOIN account_users au ON au.account_id=a.id AND au.user_id=$2 WHERE s.id=$1 AND s.tenant_id=$3 AND au.status='active'`,[request.params.id,user.id,user.tenant_id]);
    if(!result.rowCount)throw Object.assign(new Error("Statement not found."),{status:404});
    const statement=result.rows[0];
    if(["paid","void"].includes(statement.status)||Number(statement.closing_balance)<=0)throw Object.assign(new Error("This statement has no outstanding balance."),{status:409});
    const duplicate=await pool.query("SELECT * FROM payment_allocations WHERE tenant_id=$1 AND metadata->>'idempotencyKey'=$2",[user.tenant_id,input.idempotencyKey]);
    if(duplicate.rowCount)return response.json({payment:duplicate.rows[0],statement:{...statement,status:"paid"}});
    const tenantSquare=typeof square.forTenant==="function"?await square.forTenant(user.tenant_id):square;
    const payment=(await tenantSquare.createPayment({idempotency_key:`statement-${input.idempotencyKey}`,source_id:input.sourceId,amount_money:{amount:Number(statement.closing_balance),currency:statement.currency},customer_id:statement.square_customer_id,location_id:config.squareLocationId,reference_id:statement.statement_number,note:`House account settlement ${statement.statement_number}`,autocomplete:true})).payment;
    await transaction(pool,async client=>{
      await client.query(`INSERT INTO payment_allocations(tenant_id,account_id,statement_id,square_payment_id,amount,currency,status,received_at,metadata) VALUES($1,$2,$3,$4,$5,$6,'completed',now(),$7) ON CONFLICT(tenant_id,square_payment_id) DO NOTHING`,[user.tenant_id,statement.account_id,statement.id,payment.id,Number(statement.closing_balance),statement.currency,JSON.stringify({idempotencyKey:input.idempotencyKey})]);
      await postPayment(client,{tenantId:user.tenant_id,accountId:statement.account_id,paymentId:payment.id,amount:Number(statement.closing_balance),currency:statement.currency,description:`Payment for ${statement.statement_number}`,actorId:user.id});
      await client.query("UPDATE statements SET status='paid' WHERE id=$1",[statement.id]);
    });
    response.status(201).json({payment:{id:payment.id,status:payment.status},statement:{id:statement.id,status:"paid"}});
  }catch(error){next(error);}});

  app.get("/api/jobs/reconcile",async(request,response,next)=>{try{
    requireCron(request,config);
    const run=(await pool.query("INSERT INTO reconciliation_runs(tenant_id,status) SELECT id,'running' FROM tenants WHERE slug='amazing-donuts' RETURNING *")).rows[0];
    const page=await square.listPayments({begin_time:new Date(Date.now()-35*86400000).toISOString(),sort_order:"ASC",limit:100});
    let queued=0,processed=0;
    for(const payment of page.payments||[]){if(payment.status!=="COMPLETED"||!(payment.source_type==="EXTERNAL"||payment.external_details?.source?.toLowerCase().includes("house account")))continue;const inserted=await pool.query(`INSERT INTO webhook_events(tenant_id,provider_event_id,event_type,payload,status) VALUES($1,$2,'payment.updated',$3,'pending') ON CONFLICT(provider,provider_event_id) DO NOTHING RETURNING id`,[run.tenant_id,`reconcile-${payment.id}`,JSON.stringify({data:{object:{payment:{id:payment.id}}}})]);queued+=inserted.rowCount;}
    for(let index=0;index<100;index++){const item=await processNextSquareEvent(pool,square);if(!item)break;processed++;}
    await pool.query("UPDATE reconciliation_runs SET status='completed',completed_at=now(),summary=$2 WHERE id=$1",[run.id,JSON.stringify({queued,processed})]);
    response.json({ok:true,queued,processed});
  }catch(error){next(error);}});

  app.get("/api/jobs/statements",async(request,response,next)=>{try{
    requireCron(request,config);
    const today=new Date(),isFirst=today.getUTCDate()===1;
    let issued=0;
    if(isFirst){const end=new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),0)),start=new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth(),1)),periodStart=start.toISOString().slice(0,10),periodEnd=end.toISOString().slice(0,10);const accounts=await pool.query(`SELECT DISTINCT a.id,a.tenant_id FROM accounts a JOIN journal_transactions jt ON jt.account_id=a.id AND jt.effective_at>=$1::date AND jt.effective_at<($2::date+1) WHERE a.status='active'`,[periodStart,periodEnd]);for(const account of accounts.rows){try{await issueStatement(pool,{tenant_id:account.tenant_id},account.id,{periodStart,periodEnd});issued++;}catch(error){if(error.code!=="23505")throw error;}}}
    await pool.query("UPDATE statements SET status='overdue' WHERE status IN ('issued','partially_paid') AND due_at<CURRENT_DATE");
    await pool.query(`INSERT INTO statement_notifications(tenant_id,statement_id,notification_type,recipient)
      SELECT s.tenant_id,s.id,CASE WHEN s.status='overdue' THEN 'overdue' WHEN s.due_at<=CURRENT_DATE+3 THEN 'due_soon' ELSE 'issued' END,a.billing_email
      FROM statements s JOIN accounts a ON a.id=s.account_id WHERE s.status IN ('issued','partially_paid','overdue')
      ON CONFLICT(statement_id,notification_type) DO NOTHING`);
    const pending=await pool.query(`SELECT n.*,s.statement_number,s.closing_balance,s.currency,s.due_at,a.organization_name FROM statement_notifications n JOIN statements s ON s.id=n.statement_id JOIN accounts a ON a.id=s.account_id WHERE n.status='pending' ORDER BY n.created_at LIMIT 50`);
    let sent=0;
    const emailConfigured=Boolean(config.smtpHost&&config.smtpUser&&config.smtpPassword);
    if(emailConfigured){const transport=smtpTransport(config);for(const item of pending.rows){try{const subject=item.notification_type==='overdue'?`Overdue account statement ${item.statement_number}`:item.notification_type==='due_soon'?`Statement ${item.statement_number} is due soon`:`Amazing Donuts statement ${item.statement_number}`;await transport.sendMail({from:config.emailFrom,to:item.recipient,replyTo:config.emailReplyTo,subject,html:statementEmail(item,config.siteUrl)});await pool.query("UPDATE statement_notifications SET status='sent',sent_at=now(),attempts=attempts+1,error=NULL WHERE id=$1",[item.id]);sent++;}catch(error){await pool.query("UPDATE statement_notifications SET status=CASE WHEN attempts>=4 THEN 'failed' ELSE 'pending' END,attempts=attempts+1,error=$2 WHERE id=$1",[item.id,error.message]);}}}
    response.json({ok:true,issued,queued:pending.rowCount,sent,emailConfigured});
  }catch(error){next(error);}});

  app.get("/api/admin/accounts", async (request,response,next)=>{ try {
    const user=requireStaff(request);
    const accounts=await pool.query("SELECT * FROM accounts WHERE tenant_id=$1 ORDER BY created_at DESC",[user.tenant_id]);
    response.json({ accounts:await Promise.all(accounts.rows.map((account)=>hydrateAccount(pool,account))) });
  } catch(error){ next(error); }});
  app.post("/api/admin/email-test",async(request,response,next)=>{try{
    const user=requireStaff(request);
    if(!(config.smtpHost&&config.smtpUser&&config.smtpPassword))throw Object.assign(new Error("SMTP is not configured."),{status:409});
    const transport=smtpTransport(config);
    await transport.verify();
    const info=await transport.sendMail({from:config.emailFrom,to:user.email,replyTo:config.emailReplyTo,subject:"Amazing Donuts email connection test",text:"Hostinger SMTP is connected successfully to the Amazing Donuts account service."});
    response.json({ok:true,accepted:info.accepted.length});
  }catch(error){next(error);}});
  app.get("/api/admin/custom-orders",async(request,response,next)=>{try{const user=requireStaff(request),result=await pool.query(`SELECT so.id,so.square_order_id,so.payment_method AS source,so.status,so.total,so.currency,so.ordered_at,so.customizations,u.email,COALESCE(json_agg(json_build_object('id',a.id,'fileName',a.file_name,'mimeType',a.mime_type)) FILTER (WHERE a.id IS NOT NULL),'[]') AS assets FROM storefront_orders so JOIN users u ON u.id=so.user_id LEFT JOIN custom_order_assets a ON a.storefront_order_id=so.id WHERE so.tenant_id=$1 AND so.customizations<>'[]'::jsonb GROUP BY so.id,u.email ORDER BY so.ordered_at DESC LIMIT 100`,[user.tenant_id]);response.json({orders:result.rows});}catch(error){next(error);}});
  app.patch("/api/admin/accounts/:id", async (request,response,next)=>{ try {
    const user=requireStaff(request), input=accountUpdate.parse(request.body);
    const before=await pool.query("SELECT * FROM accounts WHERE id=$1 AND tenant_id=$2",[request.params.id,user.tenant_id]);
    if (!before.rowCount) throw Object.assign(new Error("Account not found."),{status:404});
    const result=await pool.query(`UPDATE accounts SET status=$3,credit_limit=$4,payment_terms_days=$5,approved_at=CASE WHEN $3='active' AND approved_at IS NULL THEN now() ELSE approved_at END,updated_at=now() WHERE id=$1 AND tenant_id=$2 RETURNING *`,[request.params.id,user.tenant_id,input.status,input.creditLimit,input.paymentTermsDays]);
    await audit(pool,user,request,"account.updated","account",request.params.id,before.rows[0],result.rows[0]); response.json({ account:result.rows[0] });
  } catch(error){ next(error); }});

  app.get("/api/admin/applications",async(request,response,next)=>{try{
    const user=requireStaff(request),status=request.query.status;
    if(status&&!['pending','approved','rejected'].includes(status)) throw Object.assign(new Error("Invalid application status."),{status:400});
    const result=await pool.query(`SELECT * FROM house_account_applications WHERE tenant_id=$1 AND ($2::text IS NULL OR status=$2) ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,created_at DESC`,[user.tenant_id,status||null]);
    response.json({applications:result.rows});
  }catch(error){next(error);}});
  app.patch("/api/admin/applications/:id",async(request,response,next)=>{try{
    const user=requireStaff(request),input=applicationReviewSchema.parse(request.body);
    const existing=await pool.query("SELECT * FROM house_account_applications WHERE id=$1 AND tenant_id=$2",[request.params.id,user.tenant_id]);
    if(!existing.rowCount) throw Object.assign(new Error("Request not found."),{status:404});
    if(existing.rows[0].status!=="pending") throw Object.assign(new Error("This request has already been reviewed."),{status:409});
    let account=null,accountCode=null,squareCustomerId=null;
    if(input.status==="approved"){
      const tenantSquare=typeof square.forTenant==="function"?await square.forTenant(user.tenant_id):square;
      const knownCustomer=await pool.query("SELECT square_customer_id FROM customer_profiles WHERE tenant_id=$1 AND user_id=$2 LIMIT 1",[user.tenant_id,existing.rows[0].user_id]);
      if(knownCustomer.rowCount)squareCustomerId=knownCustomer.rows[0].square_customer_id;else{const customer=await tenantSquare.createCustomer({idempotency_key:`house-application-${existing.rows[0].id}`,given_name:existing.rows[0].contact_name,family_name:existing.rows[0].organization_name,email_address:existing.rows[0].email,phone_number:existing.rows[0].phone||undefined,company_name:existing.rows[0].organization_name,reference_id:existing.rows[0].id});squareCustomerId=customer.customer.id;}
      accountCode=`AD-${randomBytes(3).toString("hex").toUpperCase()}`;
      const codeHash=await hashPassword(accountCode);
      account=(await pool.query(`INSERT INTO accounts(tenant_id,organization_name,account_code_hash,account_code_hint,square_customer_id,billing_email,billing_contact,credit_limit,payment_terms_days,status,approved_at,metadata) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'active',now(),$10) RETURNING *`,[user.tenant_id,existing.rows[0].organization_name,codeHash,accountCode,squareCustomerId,existing.rows[0].email,existing.rows[0].contact_name,input.creditLimit,input.paymentTermsDays,JSON.stringify({applicationId:existing.rows[0].id,organizationType:existing.rows[0].organization_type})])).rows[0];
      await pool.query("INSERT INTO account_users(account_id,user_id,role) VALUES($1,$2,'account_admin') ON CONFLICT DO NOTHING",[account.id,existing.rows[0].user_id]);
    }
    const updated=(await pool.query(`UPDATE house_account_applications SET status=$3,review_notes=$4,reviewed_at=now(),reviewed_by=$5,account_id=$6,updated_at=now() WHERE id=$1 AND tenant_id=$2 RETURNING *`,[request.params.id,user.tenant_id,input.status,input.reviewNotes||null,user.id,account?.id||null])).rows[0];
    await audit(pool,user,request,`application.${input.status}`,"application",updated.id,existing.rows[0],updated);
    response.json({application:updated,account,accountCode});
  }catch(error){next(error);}});

  app.get("/api/admin/bulk-requests",async(request,response,next)=>{try{const user=requireStaff(request),result=await pool.query(`SELECT * FROM applications WHERE tenant_id=$1 ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,created_at DESC`,[user.tenant_id]);response.json({requests:result.rows});}catch(error){next(error);}});
  app.patch("/api/admin/bulk-requests/:id",async(request,response,next)=>{try{const user=requireStaff(request),input=bulkReviewSchema.parse(request.body),existing=await pool.query("SELECT * FROM applications WHERE id=$1 AND tenant_id=$2",[request.params.id,user.tenant_id]);if(!existing.rowCount)throw Object.assign(new Error("Bulk request not found."),{status:404});if(existing.rows[0].status!=="pending")throw Object.assign(new Error("This bulk request has already been reviewed."),{status:409});const updated=(await pool.query("UPDATE applications SET status=$3,review_notes=$4,reviewed_at=now(),reviewed_by=$5,updated_at=now() WHERE id=$1 AND tenant_id=$2 RETURNING *",[request.params.id,user.tenant_id,input.status,input.reviewNotes||null,user.id])).rows[0];await audit(pool,user,request,`bulk_request.${input.status}`,"bulk_request",updated.id,existing.rows[0],updated);response.json({request:updated});}catch(error){next(error);}});

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
    response.set({"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="${row.statement_number}.pdf"`,"Cache-Control":"private, no-store"}).send(pdf);
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

  app.use((error,_request,response,_next)=>{ const validation=error instanceof z.ZodError,status=validation?400:error.status||500; if(status>=500) console.error(error); response.status(status).json({ error:{ code:validation?"VALIDATION_ERROR":error.code||"REQUEST_FAILED",message:validation?"Please check the highlighted information.":status>=500?"The account service is temporarily unavailable.":error.message,...(status<500&&error.details?{details:error.details}:{}),...(status<500&&error.issues?{details:error.issues}:{}) } }); });
  return app;
}

const publicUser=(row)=>({id:row.id,email:row.email,firstName:row.first_name,lastName:row.last_name,role:row.role,tenantId:row.tenant_id,tenantSlug:row.tenant_slug||row.slug,tenantName:row.tenant_name});

async function hydrateAccount(pool,account) {
  const [credit,orders,ledger,statements,payments,purchasers]=await Promise.all([accountCredit(pool,account.id),pool.query("SELECT * FROM orders WHERE account_id=$1 ORDER BY ordered_at DESC LIMIT 50",[account.id]),pool.query(`SELECT jt.id,jt.transaction_type,jt.description,jt.effective_at,jp.amount,jp.currency FROM journal_transactions jt JOIN journal_postings jp ON jp.transaction_id=jt.id WHERE jt.account_id=$1 AND jp.ledger_account='accounts_receivable' ORDER BY jt.effective_at DESC LIMIT 100`,[account.id]),pool.query("SELECT id,statement_number,period_start,period_end,due_at,closing_balance,currency,status FROM statements WHERE account_id=$1 ORDER BY period_end DESC LIMIT 30",[account.id]),pool.query("SELECT * FROM payment_allocations WHERE account_id=$1 ORDER BY created_at DESC LIMIT 30",[account.id]),pool.query(`SELECT u.id,u.first_name,u.last_name,u.email,u.phone,au.role,au.purchase_limit,au.status FROM account_users au JOIN users u ON u.id=au.user_id WHERE au.account_id=$1 ORDER BY u.last_name,u.first_name`,[account.id])]);
  return {...account,credit,orders:orders.rows,ledger:ledger.rows,statements:statements.rows,payments:payments.rows,purchasers:purchasers.rows};
}

async function issueStatement(pool,user,accountId,input) {
  const account=await pool.query("SELECT * FROM accounts WHERE id=$1 AND tenant_id=$2",[accountId,user.tenant_id]); if(!account.rowCount) throw Object.assign(new Error("Account not found."),{status:404});
  const [opening,entries]=await Promise.all([pool.query(`SELECT COALESCE(SUM(jp.amount),0)::bigint AS total FROM journal_postings jp JOIN journal_transactions jt ON jt.id=jp.transaction_id WHERE jp.account_id=$1 AND jp.ledger_account='accounts_receivable' AND jt.effective_at<$2::date`,[accountId,input.periodStart]),pool.query(`SELECT jt.id,jt.transaction_type,jt.description,jt.effective_at,jt.source_id,jp.amount,jp.currency,o.line_items,o.tax,o.receipt_number FROM journal_transactions jt JOIN journal_postings jp ON jp.transaction_id=jt.id LEFT JOIN orders o ON o.square_order_id=jt.source_id AND o.account_id=jt.account_id WHERE jp.account_id=$1 AND jp.ledger_account='accounts_receivable' AND jt.effective_at>=$2::date AND jt.effective_at<($3::date+1) ORDER BY jt.effective_at,jt.created_at`,[accountId,input.periodStart,input.periodEnd])]);
  const openingBalance=Number(opening.rows[0].total),charges=entries.rows.filter(e=>Number(e.amount)>0).reduce((s,e)=>s+Number(e.amount),0),credits=entries.rows.filter(e=>Number(e.amount)<0).reduce((s,e)=>s+Math.abs(Number(e.amount)),0),closing=openingBalance+charges-credits;
  const statementNumber=`${account.rows[0].account_code_hint||"HA"}-${input.periodEnd.replaceAll("-","")}-${randomUUID().slice(0,4).toUpperCase()}`;
  const snapshot={organizationName:account.rows[0].organization_name,billingContact:account.rows[0].billing_contact,entries:entries.rows.map(e=>{const itemLines=e.line_items?.map(i=>({name:`${i.name||i.catalog_object_id} x ${i.quantity}`,amount:Number(i.total_money?.amount||Number(i.base_price_money?.amount||0)*Number(i.quantity))}))||[];return {effectiveAt:e.effective_at,description:e.description,amount:Number(e.amount),currency:e.currency,reference:e.receipt_number||e.source_id,lines:itemLines.length?[...itemLines,...(Number(e.tax)?[{name:"Taxes & Fees",amount:Number(e.tax)}]:[]),{name:"Total",amount:Number(e.amount)}]:undefined};})};
  const currency=account.rows[0].currency||entries.rows.find(entry=>entry.currency)?.currency||"CAD";
  return (await pool.query(`INSERT INTO statements(tenant_id,account_id,statement_number,period_start,period_end,due_at,opening_balance,new_charges,credits_and_payments,closing_balance,currency,status,snapshot,issued_at) VALUES($1,$2,$3,$4,$5,($5::date+$6::int),$7,$8,$9,$10,$11,'issued',$12,now()) RETURNING *`,[user.tenant_id,accountId,statementNumber,input.periodStart,input.periodEnd,account.rows[0].payment_terms_days,openingBalance,charges,credits,Math.max(0,closing),currency,JSON.stringify(snapshot)])).rows[0];
}

async function audit(pool,user,request,action,targetType,targetId,before,after){ await pool.query(`INSERT INTO audit_log(tenant_id,actor_user_id,action,target_type,target_id,before_state,after_state,ip_address,user_agent) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[user.tenant_id,user.id,action,targetType,targetId,before?JSON.stringify(before):null,after?JSON.stringify(after):null,request.ip,request.get("user-agent")]); }
function requireCron(request,config){const expected=config.cronSecret;if(!expected||request.get("authorization")!==`Bearer ${expected}`)throw Object.assign(new Error("Cron authorization required."),{status:401,code:"UNAUTHORIZED"});}
function smtpTransport(config){return nodemailer.createTransport({host:config.smtpHost,port:config.smtpPort,secure:config.smtpSecure,auth:{user:config.smtpUser,pass:config.smtpPassword}});}
function statementEmail(statement,siteUrl){const amount=new Intl.NumberFormat("en-CA",{style:"currency",currency:statement.currency}).format(Number(statement.closing_balance)/100),label=statement.notification_type==='overdue'?"is overdue":statement.notification_type==='due_soon'?"is due soon":"is ready";return `<div style="font-family:Arial,sans-serif;color:#17394a;max-width:560px"><h1 style="font-size:24px">Your Amazing Donuts statement ${label}</h1><p>${statement.organization_name}</p><p><strong>${amount}</strong> is due ${String(statement.due_at).slice(0,10)}.</p><p>HST is already included in the underlying purchases.</p><p><a href="${siteUrl}/account/" style="display:inline-block;background:#d5008f;color:white;padding:12px 18px;text-decoration:none">View statement and pay</a></p></div>`;}

const normalizeName=value=>String(value||"").toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]+/g," ").trim();
const printProductNames=new Set(["twelve custom printed donuts","twelve custom printed cupcakes"]);
const validatePrintedItems=input=>{for(const item of input.items){if(!printProductNames.has(normalizeName(item.name)))continue;if(item.quantity<4)throw Object.assign(new Error("Custom-printed items have a minimum purchase of four dozen units."),{status:409,code:"PRINT_MINIMUM_REQUIRED"});if(new Date(input.fulfillment.scheduledAt).getTime()<Date.now()+7*86400000)throw Object.assign(new Error("Custom-printed items require a minimum of one week's notice."),{status:409,code:"PRINT_LEAD_TIME_REQUIRED"});const custom=input.customizations?.find(entry=>normalizeName(entry.productName)===normalizeName(item.name));if(custom?.kind!=="print"||custom.artworks.some(art=>art.count>4)||custom.artworks.reduce((sum,art)=>sum+art.count,0)!==item.quantity)throw Object.assign(new Error("Assign one print file for each group of up to four dozen units."),{status:409,code:"PRINT_ARTWORK_REQUIRED"});}};
async function catalogObjects(square){let cursor,objects=[];do{const page=await square.request("/v2/catalog/list",{query:{types:"ITEM,TAX",...(cursor?{cursor}:{})}});objects.push(...(page.objects||[]));cursor=page.cursor;}while(cursor);return objects;}
async function buildSquareOrder(square,locationId,input,user){
  if(!locationId)throw Object.assign(new Error("The Square checkout location is not configured."),{status:503});
  const objects=await catalogObjects(square),items=objects.filter(x=>x.type==="ITEM"),taxes=objects.filter(x=>x.type==="TAX"&&x.is_deleted!==true);
  const lineItems=input.items.map(line=>{
    const wanted=normalizeName(line.name),item=items.find(x=>normalizeName(x.item_data?.name)===wanted),variation=item?.item_data?.variations?.find(v=>v.item_variation_data?.price_money?.amount!=null&&!v.is_deleted);
    if(!variation)throw Object.assign(new Error(`${line.name} is not currently available in the Square catalog.`),{status:409,code:"CATALOG_ITEM_UNAVAILABLE"});
    const custom=input.customizations?.find(entry=>normalizeName(entry.productName)===wanted),note=custom?.kind==="glyph"?`CUSTOM CAKE: ${custom.glyph}`:custom?.kind==="print"?`CUSTOM PRINT: ${custom.icingFlavor} icing${custom.sprinkleColours?`, ${custom.sprinkleColours} sprinkles`:""}. ${custom.artworks.map((art,index)=>`Design ${index+1} x ${art.count} dozen units`).join(", ")}. Artwork files are in the Amazing Donuts order portal.`:undefined;
    return {catalog_object_id:variation.id,quantity:String(line.quantity),...(note?{note}:{})};
  });
  const recipient={display_name:input.fulfillment.recipient.displayName,email_address:input.fulfillment.recipient.email,phone_number:input.fulfillment.recipient.phone};
  if(input.fulfillment.address)recipient.address={address_line_1:input.fulfillment.address.addressLine1,address_line_2:input.fulfillment.address.addressLine2||undefined,locality:input.fulfillment.address.locality,administrative_district_level_1:input.fulfillment.address.administrativeDistrictLevel1,postal_code:input.fulfillment.address.postalCode,country:input.fulfillment.address.country};
  const fulfillment=input.fulfillment.type==="pickup"?{type:"PICKUP",state:"PROPOSED",pickup_details:{schedule_type:"SCHEDULED",pickup_at:input.fulfillment.scheduledAt,recipient}}:{type:"DELIVERY",state:"PROPOSED",delivery_details:{schedule_type:"SCHEDULED",deliver_at:input.fulfillment.scheduledAt,recipient,...(input.fulfillment.deliveryInstructions?{delivery_instructions:input.fulfillment.deliveryInstructions}:{}),...(input.fulfillment.noContact?{no_contact_delivery:true}:{})}};
  return {location_id:locationId,line_items:lineItems,fulfillments:[fulfillment],taxes:taxes.map((tax,index)=>({uid:`catalog-tax-${index}`,catalog_object_id:tax.id,scope:"ORDER"})),pricing_options:{auto_apply_taxes:true,auto_apply_discounts:true},source:{name:"Amazing Donuts Website"},reference_id:`web-${user.id.slice(0,8)}-${Date.now()}`};
}
async function prepareSquareOrder(square,config,input,user){
  validateDelivery(input.fulfillment,config.delivery);
  validatePrintedItems(input);
  const orderDraft=await buildSquareOrder(square,config.squareLocationId,input,user);
  const initial=(await square.request("/v2/orders/calculate",{method:"POST",body:{order:orderDraft}})).order;
  const fee=deliveryFee(merchandiseSubtotal(initial),input.fulfillment,config.delivery);
  if(fee)orderDraft.service_charges=deliveryServiceCharge(fee);
  const calculated=fee?(await square.request("/v2/orders/calculate",{method:"POST",body:{order:orderDraft}})).order:initial;
  return {orderDraft,calculated};
}
const publicDelivery=(order,input,policy)=>input.fulfillment.type==="delivery"?{provider:policy.provider,status:"AWAITING_MANUAL_DISPATCH",fee:Number(order.total_service_charge_money?.amount||0),free:Number(order.total_service_charge_money?.amount||0)===0}:null;
const publicOrder=order=>({id:order.id,total:Number(order.total_money?.amount||0),subtotal:Number(order.total_money?.amount||0)-Number(order.total_tax_money?.amount||0),tax:Number(order.total_tax_money?.amount||0),currency:order.total_money?.currency||"CAD",state:order.state,lineItems:(order.line_items||[]).map(x=>({name:x.name,quantity:x.quantity,total:Number(x.total_money?.amount||0)})),fulfillments:order.fulfillments||[]});
