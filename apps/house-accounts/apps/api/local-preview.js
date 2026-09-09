import { parse, serialize } from "cookie";

export function isolateLocalCookies(mode) {
  const prefix = `local_${mode}_`;
  return (request, response, next) => {
    request.headers.cookie = Object.entries(parse(request.headers.cookie || ""))
      .filter(([name]) => name.startsWith(prefix) && name.length > prefix.length)
      .map(([name, value]) => serialize(name.slice(prefix.length), value)).join("; ");
    const setCookie = response.cookie.bind(response);
    response.cookie = (name, ...args) => setCookie(`${prefix}${name}`, ...args);
    next();
  };
}

const READ_PATHS = new Set([
  "/api/health", "/api/auth/session", "/api/auth/google/config", "/api/admin-auth/session",
  "/api/storefront/session", "/api/storefront/config", "/api/storefront/catalog",
  "/api/storefront/addresses", "/api/storefront/wishlist", "/api/storefront/house-application",
  "/api/storefront/orders", "/api/public/careers"
]);
const POST_PATHS = new Set([
  "/api/auth/login", "/api/auth/logout", "/api/admin-auth/login", "/api/admin-auth/logout",
  "/api/storefront/quote", "/api/public/storefront/quote", "/api/storefront/address-search"
]);

/* A wishlist row is a per-user bookmark, not a live transaction: blocking the
   write made hearts in a local preview look broken - the product saved on
   screen and was gone on the next load. */
const WISHLIST_ITEM = /^\/api\/storefront\/wishlist\/[^/]+$/;

export function allowLocalPreviewRequest(method, path) {
  if (method === "GET" || method === "HEAD") return READ_PATHS.has(path) || /^\/api\/storefront\/address-search\/[^/]+$/.test(path);
  if (method === "PUT" || method === "DELETE") return WISHLIST_ITEM.test(path);
  return method === "POST" && POST_PATHS.has(path);
}
