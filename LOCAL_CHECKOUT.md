# Local Checkout Modes

Both modes use the current frontend and backend code. Nothing is deployed.

| Mode | Website | API | Data and payments |
| --- | --- | --- | --- |
| Production preview | http://localhost:5173/checkout/ | 127.0.0.1:3101 | Live catalog and price calculation; orders, payments, saved cards and account changes blocked |
| Sandbox | http://localhost:5175/checkout/ | 127.0.0.1:3102 | Square sandbox catalog/payment SDK and isolated local PostgreSQL database |

Use `localhost`, not `127.0.0.1`, for Square's production payment form. Local
login cookies are namespaced by mode. Carts, logins,
customers, catalog prices, taxes and order history are independent. Sandbox does
not contain production customers or institutional balances. Courier dispatch and
outbound email are not configured in either local mode.

## Start the Services

Production preview, in separate terminals:

```sh
npm run dev:api
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Sandbox, in separate terminals:

```sh
/opt/homebrew/opt/postgresql@17/bin/pg_ctl -D /opt/homebrew/var/postgresql@17 -l /tmp/amazing-donuts-postgres.log -o '-p 55432 -h 127.0.0.1' start
npm run dev:api:sandbox
npm run dev:sandbox
```

PostgreSQL has already been initialized on this machine with the
`amazing_donuts_sandbox` database and current migrations. Do not start it a second
time if port 55432 is already listening.

## Configuration and Testing

Production preview reads the ignored `.env.development.local` and `.env.local`.
Sandbox reads only the ignored `.env.sandbox.local`. Both require matching Square
environment, application ID, token and location. Sandbox refuses a remote database
or any database other than `amazing_donuts_sandbox` on loopback.

After schema updates, migrate only the sandbox database with:

```sh
node --env-file=.env.sandbox.local apps/house-accounts/database/migrate.js
```

Add a product to the sandbox bag, enter guest contact details, choose a collection
window, and select a payment method. Use Square sandbox test cards only. Wallets
are detected by the Square SDK and device compatibility; they are not forced on.
Production preview may display a payment form, but its backend rejects submission.
Apple Pay requires a registered HTTPS domain and cannot complete payments on
localhost: https://developer.squareup.com/docs/web-payments/apple-pay

Credentials stay server-side. Never commit local environment files or use a
production payment source in the sandbox checkout.
