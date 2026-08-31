import "dotenv/config";
import { createPool } from "./db.js";
import { createApp } from "./app.js";
import { SquareAdapter } from "../../packages/square/client.js";

const required=["DATABASE_URL","SESSION_SECRET"]; for(const key of required) if(!process.env[key]) throw new Error(`${key} is required.`);
const pool=createPool(process.env.DATABASE_URL);
const square=new SquareAdapter({environment:process.env.SQUARE_ENVIRONMENT||"sandbox",accessToken:process.env.SQUARE_ACCESS_TOKEN||"",apiVersion:process.env.SQUARE_API_VERSION||"2026-07-15"});
const app=createApp({pool,square,config:{secureCookies:process.env.NODE_ENV==="production",sessionSecret:process.env.SESSION_SECRET,siteUrl:process.env.PUBLIC_SITE_URL||`http://127.0.0.1:${process.env.PORT||3101}`,googleClientId:process.env.GOOGLE_OAUTH_CLIENT_ID||"",googleClientSecret:process.env.GOOGLE_OAUTH_CLIENT_SECRET||"",googlePlacesApiKey:process.env.GOOGLE_PLACES_API_KEY||""}});
const port=Number(process.env.PORT||3101); app.listen(port,()=>console.log(`House Account API listening on http://127.0.0.1:${port}`));
