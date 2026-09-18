import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createApp } from "../apps/api/app.js";

const preview="https://amazing-donuts-preview-talkersteins-projects.vercel.app";
const stablePreview="https://amazing-donuts-preview.vercel.app";

for(const origin of [preview,stablePreview])test(`Google preview handoff stays on ${origin} and cannot be replayed`,async t=>{
  const previous=process.env.VERCEL_ENV;
  process.env.VERCEL_ENV="preview";
  t.after(()=>{if(previous===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=previous;});
  let used=false;
  const pool={query:async(sql,values)=>{
    if(sql.includes("UPDATE google_preview_handoffs")){
      assert.equal(values[1],origin);
      if(used)return {rows:[],rowCount:0};
      used=true;
      return {rows:[{user_id:"user-1",tenant_id:"tenant-1"}],rowCount:1};
    }
    if(sql.includes("INSERT INTO sessions"))return {rows:[],rowCount:1};
    throw new Error(`Unexpected query: ${sql}`);
  }};
  const app=createApp({pool,square:{},config:{sessionSecret:"secret",secureCookies:true}});
  const server=app.listen(0,"127.0.0.1");
  await new Promise(resolve=>server.once("listening",resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const path=`/api/auth/google/handoff?token=${"a".repeat(43)}&returnTo=${encodeURIComponent("/checkout/?delivery=1")}`;
  const visit=()=>new Promise((resolve,reject)=>{
    http.get({hostname:"127.0.0.1",port:server.address().port,path,headers:{Host:new URL(origin).host}},response=>{
      let body="";response.on("data",chunk=>{body+=chunk;});response.on("end",()=>resolve({status:response.statusCode,headers:response.headers,body}));
    }).on("error",reject);
  });
  const first=await visit();
  assert.equal(first.status,302,first.body);
  assert.equal(first.headers.location,"/checkout/?delivery=1");
  assert.match(first.headers["set-cookie"]?.join(";")||"",/house_session=/);
  const replay=await visit();
  assert.equal(replay.status,410);
});

test("Google start rejects a non-project preview return host",async t=>{
  const previous=process.env.VERCEL_ENV;
  process.env.VERCEL_ENV="production";
  t.after(()=>{if(previous===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=previous;});
  const app=createApp({pool:{query:async()=>{throw Error("Unexpected DB call");}},square:{},config:{siteUrl:"https://amazing-donuts.vercel.app",sessionSecret:"secret",googleClientId:"client-id",googleClientSecret:"client-secret",secureCookies:true}});
  const server=app.listen(0,"127.0.0.1");
  await new Promise(resolve=>server.once("listening",resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base=`http://127.0.0.1:${server.address().port}`;
  const invalid=await fetch(`${base}/api/auth/google/start?previewOrigin=https%3A%2F%2Fevil.example`,{redirect:"manual"});
  assert.equal(invalid.status,400);
  for(const origin of [preview,stablePreview]){
    const valid=await fetch(`${base}/api/auth/google/start?returnTo=%2Fcheckout%2F&previewOrigin=${encodeURIComponent(origin)}`,{redirect:"manual"});
    assert.equal(valid.status,302);
    const google=new URL(valid.headers.get("location"));
    assert.equal(google.searchParams.get("redirect_uri"),"https://amazing-donuts.vercel.app/api/house/auth/google/callback");
    const [encoded]=google.searchParams.get("state").split(".");
    assert.equal(JSON.parse(Buffer.from(encoded,"base64url").toString()).previewOrigin,origin);
  }
});
