import { createPool } from "../apps/house-accounts/apps/api/db.js";
import { createApp } from "../apps/house-accounts/apps/api/app.js";
import { SquareAdapter } from "../apps/house-accounts/packages/square/client.js";
import { deliveryConfig } from "../apps/house-accounts/apps/api/delivery.js";
import { UberDirectClient } from "../apps/house-accounts/apps/api/uber-direct.js";

let app;

function getApp() {
  if (app) return app;
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  const pool=createPool(process.env.DATABASE_URL);
  const square=new SquareAdapter({environment:process.env.SQUARE_ENVIRONMENT||"sandbox",accessToken:process.env.SQUARE_ACCESS_TOKEN||"",apiVersion:process.env.SQUARE_API_VERSION||"2026-07-15"});
  const uberDirect=new UberDirectClient({clientId:process.env.UBER_DIRECT_CLIENT_ID||"",clientSecret:process.env.UBER_DIRECT_CLIENT_SECRET||"",customerId:process.env.UBER_DIRECT_CUSTOMER_ID||""});
  app=createApp({pool,square,uberDirect,config:{secureCookies:true,sessionSecret:process.env.SESSION_SECRET||"",googleClientId:process.env.GOOGLE_OAUTH_CLIENT_ID||"",googleClientSecret:process.env.GOOGLE_OAUTH_CLIENT_SECRET||"",googlePlacesApiKey:process.env.GOOGLE_PLACES_API_KEY||"",squareEnvironment:process.env.SQUARE_ENVIRONMENT||"sandbox",squareApplicationId:process.env.SQUARE_APPLICATION_ID||"",squareLocationId:process.env.SQUARE_LOCATION_ID||"",squareWebhookSignatureKey:process.env.SQUARE_WEBHOOK_SIGNATURE_KEY||"",squareWebhookNotificationUrl:process.env.SQUARE_WEBHOOK_NOTIFICATION_URL||"",institutionalTenderNames:(process.env.SQUARE_INSTITUTIONAL_TENDER_NAMES||"Amazing Donuts Account").split(",").map(value=>value.trim()).filter(Boolean),cronSecret:process.env.CRON_SECRET||"",smtpHost:process.env.SMTP_HOST||"",smtpPort:Number(process.env.SMTP_PORT||465),smtpSecure:process.env.SMTP_SECURE!=="false",smtpUser:process.env.SMTP_USER||"",smtpPassword:process.env.SMTP_PASSWORD||"",emailFrom:process.env.ACCOUNTS_EMAIL_FROM||"Amazing Donuts <accounts@amazingdonuts.com>",emailReplyTo:process.env.ACCOUNTS_REPLY_TO||process.env.SMTP_USER||"",ownerEmails:(process.env.OWNER_NOTIFICATION_EMAILS||process.env.ADMIN_EMAILS||"").split(",").map(value=>value.trim()).filter(Boolean),siteUrl:process.env.PUBLIC_SITE_URL||"https://amazing-donuts.vercel.app",delivery:deliveryConfig(),uberDirectMode:process.env.UBER_DIRECT_MODE||"sandbox",uberDirectAutoDispatch:process.env.UBER_DIRECT_AUTO_DISPATCH==="true",uberDirectWebhookSigningKey:process.env.UBER_DIRECT_WEBHOOK_SIGNING_KEY||""}});
  return app;
}

export default function handler(request,response) {
  const path=String(request.query.__path||"").replace(/^\/+/,"");
  request.url=`/api/${path}${request.url.includes("?")?`?${request.url.split("?")[1]}`:""}`;
  return getApp()(request,response);
}
