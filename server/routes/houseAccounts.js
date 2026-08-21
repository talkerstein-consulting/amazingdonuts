import { Router } from "express";
import { z } from "zod";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { AppError } from "../lib/errors.js";
import { requireUser } from "../services/auth.js";
import { buildSquareOrder, checkoutSchema, createRetailQuote } from "../services/checkout.js";
import { getAccountCredit, reserveCredit } from "../services/houseAccounts.js";

const applicationSchema = z.object({
  organizationName: z.string().trim().min(2).max(200),
  industry: z.enum(["school", "shul", "catering", "event_planner", "camp", "institution", "other"]),
  billingEmail: z.string().email(),
  defaultFulfillment: z.enum(["PICKUP", "DELIVERY"]),
  notes: z.string().trim().max(1000).optional()
});

async function membership(pool, userId) {
  const result = await pool.query(
    `SELECT a.*, u.role AS user_role, u.status AS user_status
       FROM account_users u JOIN b2b_accounts a ON a.id=u.account_id
      WHERE u.external_auth_id=$1 LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
}

async function wholesaleSquareOrder(pool, account, body, config) {
  const pricing = await pool.query(
    `SELECT square_catalog_object_id,unit_price_amount,currency,minimum_quantity FROM account_pricing
      WHERE account_id=$1 AND (starts_at IS NULL OR starts_at<=now()) AND (ends_at IS NULL OR ends_at>now())
      ORDER BY minimum_quantity DESC`,
    [account.id]
  );
  const pricesByVariation = new Map();
  for (const row of pricing.rows) pricesByVariation.set(row.square_catalog_object_id, [...(pricesByVariation.get(row.square_catalog_object_id) || []), row]);
  const order = buildSquareOrder(body, config, account.square_customer_id);
  order.source = { name: "Amazing Donuts House Account" };
  order.reference_id = `${account.account_code}${body.poNumber ? `-${body.poNumber}` : ""}`.slice(0, 40);
  order.line_items = order.line_items.map((item) => {
    const override = pricesByVariation.get(item.catalog_object_id)?.find((price) => Number(item.quantity) >= price.minimum_quantity);
    return override ? { ...item, base_price_money: { amount: Number(override.unit_price_amount), currency: override.currency } } : item;
  });
  return order;
}

export function houseAccountsRouter({ pool, square, config }) {
  const router = Router();

  router.get("/house/account", async (request, response, next) => {
    try {
      const user = requireUser(request); const account = await membership(pool, user.id);
      if (!account) return response.json({ account: null });
      const [credit, orders, ledger, statements, invoices] = await Promise.all([
        getAccountCredit(pool, account.id),
        pool.query(`SELECT id,square_order_id,status,po_number,total_amount,currency,fulfillment_type,scheduled_at,created_at FROM b2b_orders WHERE account_id=$1 ORDER BY created_at DESC LIMIT 50`, [account.id]),
        pool.query(`SELECT id,entry_type,amount,currency,effective_at,description,square_order_id FROM ledger_entries WHERE account_id=$1 ORDER BY effective_at DESC,created_at DESC LIMIT 100`, [account.id]),
        pool.query(`SELECT id,period_start,period_end,opening_balance,closing_balance,amount_due,currency,due_at,status FROM statements WHERE account_id=$1 ORDER BY period_end DESC`, [account.id]),
        pool.query(`SELECT id,square_invoice_id,amount,currency,status,public_url,due_at,created_at FROM b2b_invoices WHERE account_id=$1 ORDER BY created_at DESC`, [account.id])
      ]);
      response.json({ account: {
        id: account.id, organizationName: account.organization_name, accountCode: account.account_code,
        status: account.status, industry: account.industry, role: account.user_role,
        billingEmail: account.billing_email, paymentTermsDays: account.payment_terms_days,
        defaultFulfillment: account.default_fulfillment, currency: account.currency,
        credit, orders: orders.rows, ledger: ledger.rows, statements: statements.rows, invoices: invoices.rows
      } });
    } catch (error) { next(error); }
  });

  router.post("/house/apply", async (request, response, next) => {
    try {
      const user = requireUser(request); const input = applicationSchema.parse(request.body);
      if (await membership(pool, user.id)) throw new AppError(409, "APPLICATION_EXISTS", "This user already belongs to a wholesale account.");
      const squareCustomer = await square.createCustomer({
        idempotency_key: `b2b-${crypto.randomUUID()}`,
        company_name: input.organizationName,
        email_address: input.billingEmail.toLowerCase(),
        phone_number: user.phone,
        reference_id: `b2b-app-${user.id}`.slice(0, 40)
      });
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const account = await client.query(
          `INSERT INTO b2b_accounts (organization_name,square_customer_id,account_code,status,credit_limit_amount,payment_terms_days,billing_email,notes,industry,default_fulfillment)
           VALUES ($1,$2,$3,'pending',0,30,$4,$5,$6,$7) RETURNING *`,
          [input.organizationName, squareCustomer.customer?.id || null, `AD-${crypto.randomUUID().slice(0,8).toUpperCase()}`, input.billingEmail.toLowerCase(), input.notes || null, input.industry, input.defaultFulfillment]
        );
        await client.query(
          `INSERT INTO account_users (account_id,email,display_name,phone,role,status,external_auth_id)
           VALUES ($1,$2,$3,$4,'account_admin','active',$5)`,
          [account.rows[0].id, user.email, `${user.first_name} ${user.last_name}`, user.phone, user.id]
        );
        await client.query("COMMIT");
        if (config.MERCHANT_SUPPORT_EMAIL) await pool.query(
          `INSERT INTO notification_outbox (channel,recipient,template,payload) VALUES ('email',$1,'wholesale-application',$2)`,
          [config.MERCHANT_SUPPORT_EMAIL, JSON.stringify({ accountId: account.rows[0].id, organizationName: input.organizationName, applicant: user.email })]
        );
        response.status(201).json({ account: { id: account.rows[0].id, organizationName: input.organizationName, status: "pending" } });
      } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
    } catch (error) { next(error); }
  });

  router.post("/house/orders", async (request, response, next) => {
    let localOrderId;
    try {
      if (!config.ENABLE_HOUSE_ACCOUNTS) throw new AppError(409, "HOUSE_ACCOUNTS_GATED", "House Account ordering is awaiting final Square workflow approval.");
      const user = requireUser(request); const account = await membership(pool, user.id);
      if (!account || account.user_status !== "active") throw new AppError(403, "HOUSE_ACCOUNT_REQUIRED", "An authorized wholesale account is required.");
      if (account.status !== "active") throw new AppError(409, "ACCOUNT_INACTIVE", "This wholesale account is not active.");
      const body = z.object({
        ...checkoutSchema.omit({ redirectUrl: true }).shape,
        poNumber: z.string().trim().max(100).optional()
      }).parse({
        ...request.body,
        customer: { firstName: user.first_name, lastName: user.last_name, email: user.email, phone: user.phone }
      });
      await createRetailQuote({ square, config, body });
      const orderBody = await wholesaleSquareOrder(pool, account, body, config);
      const squareOrder = (await square.createOrder({ idempotency_key: `ho-${body.idempotencyKey}`, order: orderBody })).order;
      if (!squareOrder?.id || !squareOrder.total_money?.amount) throw new AppError(502, "INVALID_SQUARE_ORDER", "Square did not return a House Account order total.");
      const local = await pool.query(
        `INSERT INTO b2b_orders (account_id,ordered_by_user_id,square_order_id,channel,status,po_number,subtotal_amount,tax_amount,total_amount,currency,fulfillment_type,scheduled_at,metadata)
         VALUES ($1,(SELECT id FROM account_users WHERE account_id=$1 AND external_auth_id=$2 LIMIT 1),$3,'online','pending',$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING id`,
        [account.id,user.id,squareOrder.id,body.poNumber||null,Number(squareOrder.subtotal_money?.amount||0),Number(squareOrder.total_tax_money?.amount||0),Number(squareOrder.total_money.amount),squareOrder.total_money.currency,body.fulfillment.type,body.fulfillment.scheduledAt,JSON.stringify({ referenceId: squareOrder.reference_id })]
      );
      localOrderId = local.rows[0].id;
      await reserveCredit(pool, { accountId: account.id, orderId: localOrderId, amount: Number(squareOrder.total_money.amount) });
      const payment = (await square.createPayment({
        idempotency_key: `hp-${body.idempotencyKey}`,
        source_id: "EXTERNAL",
        amount_money: squareOrder.total_money,
        order_id: squareOrder.id,
        location_id: body.locationId,
        customer_id: account.square_customer_id,
        autocomplete: true,
        reference_id: squareOrder.reference_id,
        note: `Charge to House Account ${account.account_code}`,
        external_details: { type: "OTHER", source: "Amazing Donuts House Account" }
      })).payment;
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(`UPDATE b2b_orders SET status='submitted',updated_at=now(),metadata=metadata||$2::jsonb WHERE id=$1`, [localOrderId, JSON.stringify({ squarePaymentId: payment?.id })]);
        await client.query(`UPDATE credit_reservations SET status='captured',updated_at=now() WHERE b2b_order_id=$1`, [localOrderId]);
        await client.query(
          `INSERT INTO ledger_entries (account_id,b2b_order_id,square_order_id,square_payment_id,entry_type,amount,currency,description,idempotency_key,metadata)
           VALUES ($1,$2,$3,$4,'purchase',$5,$6,$7,$8,$9)`,
          [account.id,localOrderId,squareOrder.id,payment?.id||null,Number(squareOrder.total_money.amount),squareOrder.total_money.currency,`House Account order ${squareOrder.reference_id}`,`house-purchase-${squareOrder.id}`,JSON.stringify({ poNumber: body.poNumber||null, channel: "online" })]
        );
        await client.query("COMMIT");
      } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
      response.status(201).json({ orderId: squareOrder.id, houseOrderId: localOrderId, paymentId: payment?.id, status: "submitted", totalMoney: squareOrder.total_money });
    } catch (error) {
      if (localOrderId) {
        await Promise.all([
          pool.query(`UPDATE b2b_orders SET status='failed',updated_at=now() WHERE id=$1`, [localOrderId]),
          pool.query(`UPDATE credit_reservations SET status='released',updated_at=now() WHERE b2b_order_id=$1 AND status='active'`, [localOrderId])
        ]).catch(() => {});
      }
      next(error);
    }
  });

  router.post("/house/invoices", async (request, response, next) => {
    try {
      const user = requireUser(request); const account = await membership(pool, user.id);
      if (!account || account.status !== "active") throw new AppError(403, "HOUSE_ACCOUNT_REQUIRED", "An active wholesale account is required.");
      const credit = await getAccountCredit(pool, account.id);
      if (credit.balance <= 0) throw new AppError(409, "NO_BALANCE_DUE", "This account has no balance due.");
      const due = new Date(); due.setUTCDate(due.getUTCDate() + account.payment_terms_days); const dueDate = due.toISOString().slice(0,10);
      const key = crypto.randomUUID();
      const squareOrder = (await square.createOrder({ idempotency_key: `inv-order-${key}`.slice(0,45), order: {
        location_id: config.SQUARE_LOCATION_ID,
        customer_id: account.square_customer_id,
        reference_id: `balance-${account.account_code}`.slice(0,40),
        source: { name: "Amazing Donuts House Account Invoice" },
        line_items: [{ name: `House Account balance ${account.account_code}`, quantity: "1", base_price_money: { amount: credit.balance, currency: account.currency } }]
      } })).order;
      const draft = (await square.createInvoice({ idempotency_key: `invoice-${key}`, invoice: {
        location_id: config.SQUARE_LOCATION_ID,
        order_id: squareOrder.id,
        primary_recipient: { customer_id: account.square_customer_id },
        payment_requests: [{ request_type: "BALANCE", due_date: dueDate }],
        delivery_method: "EMAIL",
        accepted_payment_methods: { card: true, square_gift_card: false, bank_account: false, buy_now_pay_later: false, cash_app_pay: false },
        title: `Amazing Donuts House Account ${account.account_code}`,
        description: "Payment applies to the existing House Account receivable. Taxes were recorded on the original orders."
      } })).invoice;
      const invoice = (await square.publishInvoice(draft.id, { version: draft.version, idempotency_key: `publish-${key}` })).invoice;
      await pool.query(
        `INSERT INTO b2b_invoices (account_id,square_invoice_id,square_order_id,amount,currency,status,public_url,due_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [account.id,invoice.id,squareOrder.id,credit.balance,account.currency,invoice.status||"UNPAID",invoice.public_url||null,dueDate]
      );
      response.status(201).json({ invoice: { id: invoice.id, status: invoice.status, publicUrl: invoice.public_url, amountMoney: { amount: credit.balance, currency: account.currency }, dueDate } });
    } catch (error) { next(error); }
  });

  router.post("/house/quote", async (request, response, next) => {
    try {
      if (!config.ENABLE_HOUSE_ACCOUNTS) throw new AppError(409, "HOUSE_ACCOUNTS_GATED", "House Account ordering is awaiting final Square workflow approval.");
      const user = requireUser(request); const account = await membership(pool, user.id);
      if (!account || account.status !== "active" || account.user_status !== "active") throw new AppError(403, "HOUSE_ACCOUNT_REQUIRED", "An active wholesale account is required.");
      const body = z.object({ ...checkoutSchema.omit({ redirectUrl: true }).shape, poNumber: z.string().trim().max(100).optional() }).parse({ ...request.body, customer: { firstName: user.first_name, lastName: user.last_name, email: user.email, phone: user.phone } });
      await createRetailQuote({ square, config, body });
      const order = (await square.calculateOrder({ order: await wholesaleSquareOrder(pool, account, body, config) })).order;
      response.json({ subtotalMoney: order.subtotal_money, taxMoney: order.total_tax_money, serviceChargeMoney: order.total_service_charge_money, discountMoney: order.total_discount_money, totalMoney: order.total_money, availableCredit: (await getAccountCredit(pool, account.id)).available });
    } catch (error) { next(error); }
  });

  router.get("/admin/house/accounts", async (request, response, next) => {
    try {
      const user = requireUser(request);
      if (!config.ADMIN_EMAILS.includes(user.email)) throw new AppError(403, "FORBIDDEN", "Staff access required.");
      const result = await pool.query(`SELECT id,organization_name,account_code,status,industry,credit_limit_amount,currency,payment_terms_days,billing_email,created_at FROM b2b_accounts ORDER BY created_at DESC`);
      response.json({ accounts: result.rows });
    } catch (error) { next(error); }
  });

  router.patch("/admin/house/accounts/:id", async (request, response, next) => {
    try {
      const user = requireUser(request);
      if (!config.ADMIN_EMAILS.includes(user.email)) throw new AppError(403, "FORBIDDEN", "Staff access required.");
      const input = z.object({ status: z.enum(["active", "suspended", "closed"]), creditLimitAmount: z.number().int().min(0), paymentTermsDays: z.number().int().min(0).max(120) }).parse(request.body);
      const result = await pool.query(
        `UPDATE b2b_accounts SET status=$2,credit_limit_amount=$3,payment_terms_days=$4,updated_at=now() WHERE id=$1 RETURNING *`,
        [request.params.id, input.status, input.creditLimitAmount, input.paymentTermsDays]
      );
      if (!result.rowCount) throw new AppError(404, "ACCOUNT_NOT_FOUND", "Wholesale account not found.");
      response.json({ account: result.rows[0] });
    } catch (error) { next(error); }
  });

  router.post("/admin/house/accounts/:id/statements", async (request, response, next) => {
    try {
      const user = requireUser(request);
      if (!config.ADMIN_EMAILS.includes(user.email)) throw new AppError(403, "FORBIDDEN", "Staff access required.");
      const input = z.object({ periodStart: z.string().date(), periodEnd: z.string().date() }).parse(request.body);
      if (input.periodEnd < input.periodStart) throw new AppError(400, "INVALID_PERIOD", "Statement end must follow its start.");
      const account = await pool.query(`SELECT * FROM b2b_accounts WHERE id=$1`, [request.params.id]);
      if (!account.rowCount) throw new AppError(404, "ACCOUNT_NOT_FOUND", "Wholesale account not found.");
      const [opening, entries] = await Promise.all([
        pool.query(`SELECT COALESCE(SUM(amount),0)::bigint AS amount FROM ledger_entries WHERE account_id=$1 AND effective_at<$2::date`, [request.params.id,input.periodStart]),
        pool.query(`SELECT entry_type,amount,currency,effective_at,description,square_order_id FROM ledger_entries WHERE account_id=$1 AND effective_at>=$2::date AND effective_at<($3::date+1) ORDER BY effective_at,created_at`, [request.params.id,input.periodStart,input.periodEnd])
      ]);
      const openingAmount = Number(opening.rows[0].amount); const closingAmount = openingAmount + entries.rows.reduce((sum,row)=>sum+Number(row.amount),0);
      const result = await pool.query(
        `INSERT INTO statements (account_id,period_start,period_end,opening_balance,closing_balance,amount_due,currency,due_at,status,snapshot,issued_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,($3::date+$8::int),'issued',$9,now())
         ON CONFLICT (account_id,period_start,period_end) DO NOTHING RETURNING *`,
        [request.params.id,input.periodStart,input.periodEnd,openingAmount,closingAmount,Math.max(0,closingAmount),account.rows[0].currency,account.rows[0].payment_terms_days,JSON.stringify({ organizationName: account.rows[0].organization_name, accountCode: account.rows[0].account_code, entries: entries.rows })]
      );
      if (!result.rowCount) throw new AppError(409, "STATEMENT_EXISTS", "A statement already exists for this period.");
      response.status(201).json({ statement: result.rows[0] });
    } catch (error) { next(error); }
  });

  router.get("/house/statements/:id.pdf", async (request, response, next) => {
    try {
      const user = requireUser(request); const account = await membership(pool, user.id);
      const result = await pool.query(`SELECT s.*,a.organization_name,a.account_code FROM statements s JOIN b2b_accounts a ON a.id=s.account_id WHERE s.id=$1`, [request.params.id]);
      if (!result.rowCount || (!config.ADMIN_EMAILS.includes(user.email) && result.rows[0].account_id !== account?.id)) throw new AppError(404, "STATEMENT_NOT_FOUND", "Statement not found.");
      const statement = result.rows[0]; const pdf = await PDFDocument.create(); const page = pdf.addPage([612,792]); const regular = await pdf.embedFont(StandardFonts.Helvetica); const bold = await pdf.embedFont(StandardFonts.HelveticaBold); const ink = rgb(27/255,58/255,75/255); const magenta = rgb(190/255,31/255,128/255);
      page.drawText("AMAZING DONUTS",{x:48,y:744,size:20,font:bold,color:magenta}); page.drawText("HOUSE ACCOUNT STATEMENT",{x:48,y:718,size:11,font:bold,color:ink});
      page.drawText(statement.organization_name,{x:48,y:675,size:18,font:bold,color:ink}); page.drawText(`Account ${statement.account_code}`,{x:48,y:655,size:10,font:regular,color:ink}); page.drawText(`${statement.period_start} to ${statement.period_end}`,{x:390,y:675,size:10,font:regular,color:ink}); page.drawText(`Due ${statement.due_at}`,{x:390,y:655,size:10,font:bold,color:ink});
      let y=610; page.drawText("DATE",{x:48,y,size:9,font:bold,color:ink}); page.drawText("DESCRIPTION",{x:130,y,size:9,font:bold,color:ink}); page.drawText("AMOUNT",{x:490,y,size:9,font:bold,color:ink}); y-=22;
      for (const entry of statement.snapshot?.entries || []) { if (y<90) break; page.drawText(new Date(entry.effective_at).toISOString().slice(0,10),{x:48,y,size:8,font:regular,color:ink}); page.drawText(String(entry.description).slice(0,58),{x:130,y,size:8,font:regular,color:ink}); page.drawText(currencyText(Number(entry.amount),entry.currency),{x:490,y,size:8,font:regular,color:ink}); y-=18; }
      y-=14; page.drawText(`Opening balance: ${currencyText(Number(statement.opening_balance),statement.currency)}`,{x:330,y,size:10,font:regular,color:ink}); y-=20; page.drawText(`Closing balance: ${currencyText(Number(statement.closing_balance),statement.currency)}`,{x:330,y,size:11,font:bold,color:ink}); y-=20; page.drawText(`Amount due: ${currencyText(Number(statement.amount_due),statement.currency)}`,{x:330,y,size:13,font:bold,color:magenta});
      const bytes = await pdf.save(); response.set({ "Content-Type":"application/pdf", "Content-Disposition":`inline; filename="amazing-donuts-statement-${statement.period_end}.pdf"`, "Cache-Control":"private, no-store" }); response.send(Buffer.from(bytes));
    } catch (error) { next(error); }
  });

  return router;
}

function currencyText(amount, currency) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: currency || "CAD" }).format(amount / 100);
}
