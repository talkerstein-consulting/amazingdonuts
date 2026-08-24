import { createPool } from "../apps/house-accounts/apps/api/db.js";
import { createApp } from "../apps/house-accounts/apps/api/app.js";
import { SquareAdapter } from "../apps/house-accounts/packages/square/client.js";
import { deliveryConfig } from "../apps/house-accounts/apps/api/delivery.js";

let app;

function getApp() {
  if (app) return app;
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  const pool=createPool(process.env.DATABASE_URL);
  const square=new SquareAdapter({environment:process.env.SQUARE_ENVIRONMENT||"sandbox",accessToken:process.env.SQUARE_ACCESS_TOKEN||"",apiVersion:process.env.SQUARE_API_VERSION||"2026-07-15"});
  app=createApp({pool,square,config:{secureCookies:true,squareEnvironment:process.env.SQUARE_ENVIRONMENT||"sandbox",squareApplicationId:process.env.SQUARE_APPLICATION_ID||"",squareLocationId:process.env.SQUARE_LOCATION_ID||"",cronSecret:process.env.CRON_SECRET||"",smtpHost:process.env.SMTP_HOST||"",smtpPort:Number(process.env.SMTP_PORT||465),smtpSecure:process.env.SMTP_SECURE!=="false",smtpUser:process.env.SMTP_USER||"",smtpPassword:process.env.SMTP_PASSWORD||"",emailFrom:process.env.ACCOUNTS_EMAIL_FROM||"Amazing Donuts <accounts@amazingdonuts.com>",emailReplyTo:process.env.ACCOUNTS_REPLY_TO||process.env.SMTP_USER||"",ownerEmails:(process.env.OWNER_NOTIFICATION_EMAILS||process.env.ADMIN_EMAILS||"").split(",").map(value=>value.trim()).filter(Boolean),siteUrl:process.env.PUBLIC_SITE_URL||"https://amazing-donuts.vercel.app",delivery:deliveryConfig()}});
  return app;
}

export default function handler(request,response) {
  const path=String(request.query.__path||"").replace(/^\/+/,"");
  request.url=`/api/${path}${request.url.includes("?")?`?${request.url.split("?")[1]}`:""}`;
  return getApp()(request,response);
}
