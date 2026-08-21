import { AppError } from "../lib/errors.js";

const BASE_URLS = {
  sandbox: "https://connect.squareupsandbox.com",
  production: "https://connect.squareup.com"
};

export class SquareClient {
  constructor({ accessToken, environment, apiVersion, fetchImpl = fetch }) {
    this.accessToken = accessToken;
    this.baseUrl = BASE_URLS[environment];
    this.apiVersion = apiVersion;
    this.fetch = fetchImpl;
  }

  async request(path, { method = "GET", body, query } = {}) {
    const url = new URL(path, this.baseUrl);
    for (const [key, value] of Object.entries(query || {})) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }

    const response = await this.fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        "Square-Version": this.apiVersion
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const squareErrors = payload.errors || [];
      const message = squareErrors.map((error) => error.detail || error.code).join("; ");
      throw new AppError(
        response.status >= 500 ? 502 : response.status,
        "SQUARE_API_ERROR",
        message || "Square rejected the request.",
        squareErrors
      );
    }

    return payload;
  }

  async listLocations() {
    return this.request("/v2/locations");
  }

  async searchCatalog(body) {
    const objects = [];
    const relatedObjects = [];
    let cursor;

    do {
      const page = await this.request("/v2/catalog/search", {
        method: "POST",
        body: { ...body, ...(cursor ? { cursor } : {}) }
      });
      objects.push(...(page.objects || []));
      relatedObjects.push(...(page.related_objects || []));
      cursor = page.cursor;
    } while (cursor);

    return { objects, relatedObjects };
  }

  async batchUpsertCatalog(objects, idempotencyKey) {
    return this.request("/v2/catalog/batch-upsert", {
      method: "POST",
      body: {
        idempotency_key: idempotencyKey,
        batches: [{ objects }]
      }
    });
  }

  async createCatalogImage({ objectId, imageId, caption, file, idempotencyKey }) {
    const url = new URL("/v2/catalog/images", this.baseUrl);
    const form = new FormData();
    form.append("file", file);
    form.append(
      "request",
      JSON.stringify({
        idempotency_key: idempotencyKey,
        object_id: objectId,
        image: {
          type: "IMAGE",
          id: imageId,
          image_data: { caption }
        },
        is_primary: true
      })
    );

    const response = await this.fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Square-Version": this.apiVersion
      },
      body: form
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const squareErrors = payload.errors || [];
      const message = squareErrors.map((error) => error.detail || error.code).join("; ");
      throw new AppError(
        response.status >= 500 ? 502 : response.status,
        "SQUARE_API_ERROR",
        message || "Square rejected the image upload.",
        squareErrors
      );
    }
    return payload;
  }

  async batchChangeInventory(changes, idempotencyKey) {
    return this.request("/v2/inventory/changes/batch-create", {
      method: "POST",
      body: {
        idempotency_key: idempotencyKey,
        changes,
        ignore_unchanged_counts: true
      }
    });
  }

  async retrieveInventoryCounts(catalogObjectIds, locationIds) {
    if (!catalogObjectIds.length) return { counts: [] };
    return this.request("/v2/inventory/counts/batch-retrieve", {
      method: "POST",
      body: {
        catalog_object_ids: catalogObjectIds,
        location_ids: locationIds,
        states: ["IN_STOCK"]
      }
    });
  }

  async createPaymentLink(body) {
    return this.request("/v2/online-checkout/payment-links", { method: "POST", body });
  }

  async createOrder(body) {
    return this.request("/v2/orders", { method: "POST", body });
  }

  async calculateOrder(body) {
    return this.request("/v2/orders/calculate", { method: "POST", body });
  }

  async retrieveOrder(orderId) {
    return this.request(`/v2/orders/${encodeURIComponent(orderId)}`);
  }

  async createPayment(body) {
    return this.request("/v2/payments", { method: "POST", body });
  }

  async createCard(body) {
    return this.request("/v2/cards", { method: "POST", body });
  }

  async listCards(customerId) {
    return this.request("/v2/cards", { query: { customer_id: customerId, include_disabled: false } });
  }

  async disableCard(cardId) {
    return this.request(`/v2/cards/${encodeURIComponent(cardId)}/disable`, { method: "POST" });
  }

  async refundPayment(body) {
    return this.request("/v2/refunds", { method: "POST", body });
  }

  async createInvoice(body) {
    return this.request("/v2/invoices", { method: "POST", body });
  }

  async publishInvoice(invoiceId, body) {
    return this.request(`/v2/invoices/${encodeURIComponent(invoiceId)}/publish`, { method: "POST", body });
  }

  async searchCustomers(filter) {
    return this.request("/v2/customers/search", {
      method: "POST",
      body: { query: { filter }, limit: 10 }
    });
  }

  async createCustomer(body) {
    return this.request("/v2/customers", { method: "POST", body });
  }
}
