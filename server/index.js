import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createPool } from "./db/pool.js";
import { SquareClient } from "./square/client.js";

const config = loadConfig();
const pool = createPool(config.DATABASE_URL);
const square = new SquareClient({
  accessToken: config.SQUARE_ACCESS_TOKEN,
  environment: config.SQUARE_ENVIRONMENT,
  apiVersion: config.SQUARE_API_VERSION
});
const app = createApp({ config, square, pool });

const server = app.listen(config.PORT, () => {
  console.log(`Amazing Donuts API listening on http://localhost:${config.PORT}`);
});

async function shutdown(signal) {
  console.log(`${signal} received; closing API.`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
