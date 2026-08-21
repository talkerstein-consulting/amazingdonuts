import { createApp } from "../server/app.js";
import { loadConfig } from "../server/config.js";
import { createPool } from "../server/db/pool.js";
import { SquareClient } from "../server/square/client.js";

const config = loadConfig();
const pool = createPool(config.DATABASE_URL);
const square = new SquareClient({
  accessToken: config.SQUARE_ACCESS_TOKEN,
  environment: config.SQUARE_ENVIRONMENT,
  apiVersion: config.SQUARE_API_VERSION
});

export default createApp({ config, square, pool });
