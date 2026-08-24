import { SquareAdapter } from "./client.js";

export class SquareRegistry {
  constructor({ pool, decryptCredentials, apiVersion }) {
    this.pool=pool;
    this.decryptCredentials=decryptCredentials;
    this.apiVersion=apiVersion;
    this.cache=new Map();
  }

  async forTenant(tenantId) {
    if (this.cache.has(tenantId)) return this.cache.get(tenantId);
    const result=await this.pool.query("SELECT * FROM tenant_integrations WHERE tenant_id=$1 AND provider='square' AND status='active'",[tenantId]);
    if (!result.rowCount) throw Object.assign(new Error("Square is not configured for this tenant."),{status:409,code:"SQUARE_NOT_CONFIGURED"});
    const credentials=await this.decryptCredentials(result.rows[0].encrypted_credentials,result.rows[0].key_reference);
    const adapter=new SquareAdapter({environment:result.rows[0].environment,accessToken:credentials.accessToken,apiVersion:this.apiVersion});
    this.cache.set(tenantId,adapter);
    return adapter;
  }

  invalidate(tenantId) { this.cache.delete(tenantId); }
}
