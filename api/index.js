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

const app = createApp({ config, square, pool });

export default function handler(request, response) {
  const originalPath = request.query?.__path;
  if (typeof originalPath === "string" && originalPath) {
    const url = new URL(request.url, "http://localhost");
    url.pathname = `/api/${originalPath}`;
    url.searchParams.delete("__path");
    request.url = `${url.pathname}${url.search}`;
  }
  return app(request, response);
}
