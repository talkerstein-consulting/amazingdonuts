# Amazing Donuts Backend Architecture

## Source-of-truth boundaries

| Concern | System of record |
|---|---|
| Products, variations, modifiers, taxes, images | Square Catalog |
| Inventory by item variation and location | Square Inventory |
| Retail and itemized B2B orders | Square Orders |
| Card and wallet payments | Square Payments |
| House Account balances, credit, statements, authorization | Amazing Donuts PostgreSQL |

The browser never receives a Square access token and never supplies authoritative prices.
Retail checkout submits Square catalog object IDs to this API. The API creates a Square
hosted checkout link containing the itemized order and fulfillment.

## Runtime flow

1. `GET /api/locations` returns enabled Square locations.
2. `GET /api/catalog?locationId=...` combines Catalog and Inventory into frontend-ready JSON.
3. `POST /api/checkout/payment-link` validates the cart, finds or creates a Square Customer,
   and creates a Square-hosted payment link with a real Square Order.
4. Square redirects the buyer after payment. The confirmation page must retrieve/verify the
   order rather than trusting query-string state.
5. `POST /api/webhooks/square` validates Square's HMAC signature and stores each event exactly
   once. Order events update the local order projection; catalog events request a refresh.

## Public API

### `GET /api/locations`

Returns active locations allowed by `SQUARE_LOCATION_ID`.

### `GET /api/catalog?locationId=LOCATION_ID`

Returns normalized categories, products, variations, modifier lists, images, and current
in-stock quantities. Products should eventually replace `src/data/products.js` in ordering UI.

### `POST /api/checkout/payment-link`

```json
{
  "idempotencyKey": "c77d5d09-d7ee-47a4-88c5-fb1992be8cf6",
  "locationId": "SQUARE_LOCATION_ID",
  "customer": {
    "firstName": "Test",
    "lastName": "Customer",
    "email": "test@example.com",
    "phone": "+14165550100"
  },
  "lineItems": [
    {
      "catalogObjectId": "SQUARE_VARIATION_ID",
      "quantity": 2,
      "modifiers": [{ "catalogObjectId": "SQUARE_MODIFIER_ID", "quantity": 1 }]
    }
  ],
  "fulfillment": {
    "type": "PICKUP",
    "scheduledAt": "2026-08-22T14:00:00-04:00"
  }
}
```

The response includes `orderId`, `paymentLinkId`, and `checkoutUrl`.

## Required Square webhook subscriptions

- `catalog.version.updated`
- `inventory.count.updated`
- `order.created`
- `order.updated`
- `order.fulfillment.updated`
- `payment.created`
- `payment.updated`
- `refund.created`
- `refund.updated`
- `customer.created`
- `customer.updated`

Use the exact production notification URL in both Square Developer Console and
`SQUARE_WEBHOOK_NOTIFICATION_URL`; the URL participates in signature verification.

## House Account gate

The database includes account, user, pricing, order, credit reservation, immutable ledger,
statement snapshot, payment, unmatched POS transaction, and audit tables. Credit reservation
uses a database row lock so simultaneous orders cannot exceed an account's limit.

Do not expose House Account order placement in production until all Phase 0 tests pass:

1. Confirm a POS custom tender is distinguishable in Orders/Payments webhooks.
2. Confirm the attached Square Customer and order survive the POS flow.
3. Confirm an online external payment representation routes the order to Order Manager/KDS.
4. Confirm scheduled pickup and delivery timing in KDS.
5. Confirm full and partial cancellation/refund events.
6. Confirm Square's current Orders API fee treatment in writing.

`ENABLE_HOUSE_ACCOUNTS=false` is the default. `ENABLE_DELIVERY=false` separately gates the
own-driver delivery fulfillment until its Order Manager/KDS behavior is verified.

## Legacy exports

The BigCommerce product and customer CSVs are migration inputs only. They are not committed.
Run the read-only analyzer to get counts and cleanup flags without printing PII:

```sh
npm run data:analyze -- "/absolute/path/to/Website Data"
```

Products should be cleaned and imported into Square first. The website then reads the resulting
Square object IDs. Customer import must deduplicate by normalized email/phone before creating
Square profiles.
