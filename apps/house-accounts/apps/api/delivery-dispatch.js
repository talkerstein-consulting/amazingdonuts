import { createHash, randomBytes } from "node:crypto";

export const LOCAL_DELIVERY_STATUSES = [
  "dispatching_soon",
  "out_for_delivery",
  "arriving_soon",
  "delivered",
];

const UBER_STATUS_MAP = {
  pending: "dispatching_soon",
  courier_assigned: "dispatching_soon",
  courier_en_route: "dispatching_soon",
  pickup: "dispatching_soon",
  pickup_complete: "out_for_delivery",
  dropoff: "out_for_delivery",
  dropoff_imminent: "arriving_soon",
  delivered: "delivered",
  scheduled: "dispatching_soon",
  en_route_to_pickup: "dispatching_soon",
  arrived_at_pickup: "dispatching_soon",
  en_route_to_dropoff: "out_for_delivery",
  arrived_at_dropoff: "arriving_soon",
  completed: "delivered",
};

export const dispatchTokenHash = (token) => createHash("sha256").update(String(token)).digest("hex");

function createCapability(siteUrl, scheduledAt, parameter) {
  const token = randomBytes(32).toString("base64url");
  const deliveryTime = new Date(scheduledAt).getTime();
  const expiresAt = new Date(Math.max(Date.now() + 24 * 60 * 60 * 1000, deliveryTime + 24 * 60 * 60 * 1000));
  const url = new URL("/admin-dashboard/", siteUrl);
  url.searchParams.set(parameter, token);
  return { token, tokenHash: dispatchTokenHash(token), expiresAt, url: url.toString() };
}

export const createDispatchCapability = (siteUrl, scheduledAt) => createCapability(siteUrl, scheduledAt, "dispatch");
export const createDriverCapability = (siteUrl, scheduledAt) => createCapability(siteUrl, scheduledAt, "driver");

export function withDispatchInstructions(fulfillment, dispatchUrl) {
  if (fulfillment.type !== "delivery") return fulfillment;
  const customerInstructions = String(fulfillment.deliveryInstructions || "").trim();
  const dispatchLine = `STAFF DELIVERY DISPATCH: ${dispatchUrl}`;
  const available = 500 - dispatchLine.length - (customerInstructions ? 2 : 0);
  const deliveryInstructions = customerInstructions
    ? `${customerInstructions.slice(0, Math.max(0, available))}\n\n${dispatchLine}`
    : dispatchLine;
  return { ...fulfillment, deliveryInstructions };
}

export function normalizedDeliveryStatus(provider, status) {
  const value = String(status || "dispatching_soon").toLowerCase();
  if (LOCAL_DELIVERY_STATUSES.includes(value)) return value;
  if (String(provider || "").toLowerCase() === "uber_direct" || (!provider && UBER_STATUS_MAP[value])) return UBER_STATUS_MAP[value] || "dispatching_soon";
  return "dispatching_soon";
}

export function deliveryStatusLabel(provider, status) {
  const exceptional = {
    canceled: "Delivery cancelled",
    cancelled: "Delivery cancelled",
    returned: "Returned to bakery",
    dispatch_failed: "Delivery dispatch failed",
  };
  const raw = String(status || "").toLowerCase();
  if (exceptional[raw]) return exceptional[raw];
  const labels = {
    dispatching_soon: "Dispatching soon",
    out_for_delivery: "Out for delivery",
    arriving_soon: "Arriving soon",
    delivered: "Delivered",
  };
  return labels[normalizedDeliveryStatus(provider, status)];
}

export function assertLocalStatusTransition(currentStatus, nextStatus) {
  const current = LOCAL_DELIVERY_STATUSES.indexOf(normalizedDeliveryStatus("own_driver", currentStatus));
  const next = LOCAL_DELIVERY_STATUSES.indexOf(nextStatus);
  if (next < 0) throw Object.assign(new Error("Choose a valid delivery status."), { status: 400, code: "INVALID_DELIVERY_STATUS" });
  if (next < current) throw Object.assign(new Error("A delivery status cannot move backwards."), { status: 409, code: "DELIVERY_STATUS_REGRESSION" });
}
