import { createHmac, timingSafeEqual } from "node:crypto";

export class UberDirectClient {
  constructor({clientId,clientSecret,customerId,fetchImpl=fetch}) {
    this.clientId=clientId;
    this.clientSecret=clientSecret;
    this.customerId=customerId;
    this.fetch=fetchImpl;
    this.token=null;
    this.tokenExpiresAt=0;
  }

  get configured(){return Boolean(this.clientId&&this.clientSecret&&this.customerId);}

  async accessToken(){
    if(!this.configured)throw Object.assign(new Error("Uber Direct sandbox credentials are not configured."),{status:503,code:"UBER_DIRECT_NOT_CONFIGURED"});
    if(this.token&&Date.now()<this.tokenExpiresAt-60000)return this.token;
    const response=await this.fetch("https://auth.uber.com/oauth/v2/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:this.clientId,client_secret:this.clientSecret,grant_type:"client_credentials",scope:"eats.deliveries"})});
    const body=await response.json().catch(()=>({}));
    if(!response.ok||!body.access_token)throw Object.assign(new Error(body.error_description||body.error||"Uber Direct authentication failed."),{status:502,code:"UBER_DIRECT_AUTH_FAILED"});
    this.token=body.access_token;
    this.tokenExpiresAt=Date.now()+Number(body.expires_in||3600)*1000;
    return this.token;
  }

  async request(path,{method="GET",body}={}){
    const token=await this.accessToken();
    const response=await this.fetch(`https://api.uber.com/v1/customers/${encodeURIComponent(this.customerId)}${path}`,{method,headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},...(body?{body:JSON.stringify(body)}:{})});
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw Object.assign(new Error(result.message||result.error||"Uber Direct request failed."),{status:502,code:"UBER_DIRECT_REQUEST_FAILED",details:result});
    return result;
  }

  createQuote(input){return this.request("/delivery_quotes",{method:"POST",body:input});}
  createDelivery(input){return this.request("/deliveries",{method:"POST",body:input});}
}

export function validUberSignature(rawBody,signature,signingKey){
  if(!rawBody||!signature||!signingKey)return false;
  const expected=createHmac("sha256",signingKey).update(rawBody).digest("hex"),provided=String(signature).trim().toLowerCase();
  return provided.length===expected.length&&timingSafeEqual(Buffer.from(provided),Buffer.from(expected));
}
