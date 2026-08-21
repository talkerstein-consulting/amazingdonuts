import { Router } from "express";
import { z } from "zod";
import { AppError } from "../lib/errors.js";
import { requireUser } from "../services/auth.js";

const addressSchema = z.object({
  label: z.string().trim().min(1).max(60),
  addressLine1: z.string().trim().min(1).max(200),
  addressLine2: z.string().trim().max(200).optional(),
  locality: z.string().trim().min(1).max(100),
  administrativeDistrictLevel1: z.string().trim().length(2).default("ON"),
  postalCode: z.string().trim().min(3).max(10),
  country: z.string().length(2).default("CA"),
  deliveryInstructions: z.string().trim().max(500).optional(),
  isDefault: z.boolean().default(false)
});

const addressJson = (row) => ({
  id: row.id,
  label: row.label,
  addressLine1: row.address_line_1,
  addressLine2: row.address_line_2,
  locality: row.locality,
  administrativeDistrictLevel1: row.administrative_district_level_1,
  postalCode: row.postal_code,
  country: row.country,
  deliveryInstructions: row.delivery_instructions,
  isDefault: row.is_default
});

export function accountRouter({ pool, square, config }) {
  const router = Router();

  router.get("/account/addresses", async (request, response, next) => {
    try {
      const user = requireUser(request);
      const result = await pool.query("SELECT * FROM retail_addresses WHERE user_id=$1 ORDER BY is_default DESC, created_at", [user.id]);
      response.json({ addresses: result.rows.map(addressJson) });
    } catch (error) { next(error); }
  });

  router.post("/account/addresses", async (request, response, next) => {
    try {
      const user = requireUser(request);
      const input = addressSchema.parse(request.body);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        if (input.isDefault) await client.query("UPDATE retail_addresses SET is_default=false WHERE user_id=$1", [user.id]);
        const result = await client.query(
          `INSERT INTO retail_addresses (user_id,label,address_line_1,address_line_2,locality,administrative_district_level_1,postal_code,country,delivery_instructions,is_default)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
          [user.id,input.label,input.addressLine1,input.addressLine2||null,input.locality,input.administrativeDistrictLevel1.toUpperCase(),input.postalCode.toUpperCase(),input.country,input.deliveryInstructions||null,input.isDefault]
        );
        await client.query("COMMIT");
        response.status(201).json({ address: addressJson(result.rows[0]) });
      } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
    } catch (error) { next(error); }
  });

  router.delete("/account/addresses/:id", async (request, response, next) => {
    try {
      const user = requireUser(request);
      await pool.query("DELETE FROM retail_addresses WHERE id=$1 AND user_id=$2", [request.params.id, user.id]);
      response.status(204).end();
    } catch (error) { next(error); }
  });

  router.get("/account/cards", async (request, response, next) => {
    try {
      const user = requireUser(request);
      if (!user.square_customer_id) return response.json({ cards: [] });
      const result = await square.listCards(user.square_customer_id);
      response.json({ cards: (result.cards || []).map((card) => ({
        id: card.id, brand: card.card_brand, last4: card.last_4, expMonth: card.exp_month, expYear: card.exp_year
      })) });
    } catch (error) { next(error); }
  });

  router.delete("/account/cards/:id", async (request, response, next) => {
    try {
      const user = requireUser(request);
      const cards = user.square_customer_id ? (await square.listCards(user.square_customer_id)).cards || [] : [];
      if (!cards.some((card) => card.id === request.params.id)) throw new AppError(404, "CARD_NOT_FOUND", "Saved card not found.");
      await square.disableCard(request.params.id);
      response.status(204).end();
    } catch (error) { next(error); }
  });

  router.get("/account/orders", async (request, response, next) => {
    try {
      const user = requireUser(request);
      if (!user.square_customer_id) return response.json({ orders: [] });
      const result = await pool.query(
        `SELECT square_order_id,state,fulfillment_type,scheduled_at,total_amount,currency,raw_order,created_at
           FROM square_orders
          WHERE square_customer_id=$1 AND source NOT LIKE 'Amazing Donuts House Account%'
          ORDER BY created_at DESC LIMIT 100`,
        [user.square_customer_id]
      );
      response.json({ orders: result.rows.map((row) => ({
        id: row.square_order_id,
        state: row.state,
        fulfillmentType: row.fulfillment_type,
        scheduledAt: row.scheduled_at,
        totalMoney: { amount: Number(row.total_amount || 0), currency: row.currency || "CAD" },
        lineItems: (row.raw_order?.line_items || []).map((item) => ({
          name: item.name, quantity: Number(item.quantity), catalogObjectId: item.catalog_object_id,
          modifiers: item.modifiers || [], note: item.note || null
        })),
        createdAt: row.created_at
      })) });
    } catch (error) { next(error); }
  });

  router.post("/account/orders/:id/refund-request", async (request, response, next) => {
    try {
      const user = requireUser(request);
      const input = z.object({ reason: z.string().trim().min(10).max(1000) }).parse(request.body);
      const order = await pool.query(
        `SELECT square_order_id,total_amount,currency FROM square_orders
          WHERE square_order_id=$1 AND square_customer_id=$2 AND source NOT LIKE 'Amazing Donuts House Account%'`,
        [request.params.id, user.square_customer_id]
      );
      if (!order.rowCount) throw new AppError(404, "ORDER_NOT_FOUND", "Order not found.");
      const result = await pool.query(
        `INSERT INTO refund_requests (user_id,square_order_id,reason,requested_amount)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (user_id,square_order_id) DO UPDATE SET reason=EXCLUDED.reason,updated_at=now()
         RETURNING id,status,created_at`,
        [user.id, request.params.id, input.reason, order.rows[0].total_amount]
      );
      if (config.MERCHANT_SUPPORT_EMAIL) {
        await pool.query(
          `INSERT INTO notification_outbox (channel,recipient,template,payload) VALUES ('email',$1,'refund-request',$2)`,
          [config.MERCHANT_SUPPORT_EMAIL, JSON.stringify({ requestId: result.rows[0].id, orderId: request.params.id, customerEmail: user.email, reason: input.reason })]
        );
      }
      response.status(201).json({ request: result.rows[0] });
    } catch (error) { next(error); }
  });

  return router;
}
