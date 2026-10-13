import { createClient } from "@supabase/supabase-js";
export const json = (statusCode, body, extra={}) => ({
  statusCode,
  headers: {"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff",...extra},
  body: JSON.stringify(body)
});
export const parseBody = event => {
  try { const body=JSON.parse(event.body||"{}"); return body && typeof body==="object" && !Array.isArray(body) ? body : null; }
  catch { return null; }
};
export const db = () => {
  const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key) throw new Error("Database is not configured. Please try again later.");
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
};
export const validEmail = value => typeof value==="string" && value.length<=254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export const clean = value => typeof value==="string" ? value.trim() : "";
export const reference = prefix => `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0,8).toUpperCase()}`;
export const originAllowed = event => {
  const configured=process.env.ALLOWED_ORIGIN;
  if(!configured)return true;
  const origin=event.headers?.origin;
  return !origin || origin===configured;
};
export const methodNotAllowed = () => json(405,{error:"Method not allowed."},{Allow:"POST"});
