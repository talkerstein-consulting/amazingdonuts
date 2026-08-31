const URLS = { sandbox: "https://connect.squareupsandbox.com", production: "https://connect.squareup.com" };

export class SquareAdapter {
  constructor({ environment, accessToken, apiVersion, fetchImpl = fetch }) {
    this.baseUrl = URLS[environment];
    this.accessToken = accessToken;
    this.apiVersion = apiVersion;
    this.fetch = fetchImpl;
  }

  async request(path, { method = "GET", body, query } = {}) {
    const url = new URL(path, this.baseUrl);
    Object.entries(query || {}).forEach(([key, value]) => value != null && url.searchParams.set(key, String(value)));
    const response = await this.fetch(url, {
      method,
      headers: { Authorization: `Bearer ${this.accessToken}`, "Square-Version": this.apiVersion, "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(payload.errors?.[0]?.detail || "Square rejected the request."), { status: [401,403,429].includes(response.status) ? 502 : response.status, details: payload.errors });
    return payload;
  }

  createOrder(body) { return this.request("/v2/orders", { method: "POST", body }); }
  createPayment(body) { return this.request("/v2/payments", { method: "POST", body }); }
  createInvoice(body) { return this.request("/v2/invoices", { method:"POST", body }); }
  publishInvoice(id,body) { return this.request(`/v2/invoices/${encodeURIComponent(id)}/publish`, { method:"POST", body }); }
  retrieveInvoice(id) { return this.request(`/v2/invoices/${encodeURIComponent(id)}`); }
  createCard(body) { return this.request("/v2/cards", { method: "POST", body }); }
  listCards(query) { return this.request("/v2/cards", { query }); }
  disableCard(id) { return this.request(`/v2/cards/${encodeURIComponent(id)}/disable`, { method:"POST" }); }
  refundPayment(body) { return this.request("/v2/refunds", { method:"POST", body }); }
  retrieveRefund(id) { return this.request(`/v2/refunds/${encodeURIComponent(id)}`); }
  retrieveOrder(id) { return this.request(`/v2/orders/${encodeURIComponent(id)}`); }
  retrievePayment(id) { return this.request(`/v2/payments/${encodeURIComponent(id)}`); }
  listPayments(query) { return this.request("/v2/payments", { query }); }
  searchCustomers(body) { return this.request("/v2/customers/search", { method: "POST", body }); }
  createCustomer(body) { return this.request("/v2/customers", { method: "POST", body }); }
  updateCustomer(id,body) { return this.request(`/v2/customers/${encodeURIComponent(id)}`, { method: "PUT", body }); }
}
