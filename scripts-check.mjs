import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
const required = [
  "public/index.html", "public/admin.html", "public/assets/site.css",
  "public/assets/site.js", "public/assets/admin.js", "database/schema.sql",
  "netlify/functions/submit-enquiry.mjs", "netlify/functions/register-driver.mjs",
  "netlify/functions/ai-chat.mjs", "netlify/functions/application-status.mjs"
];
for (const file of required) {
  await access(new URL(file, `file://${process.cwd()}/`), constants.R_OK);
}
const html = await readFile("public/index.html", "utf8");
if (!html.includes('id="quote-form"') || !html.includes('id="driver-form"')) {
  throw new Error("Required public forms were not found.");
}
console.log(`Build check passed: ${required.length} required files exist.`);
console.log("Static publish directory: public/");
console.log("Note: production data features require Supabase setup; see README.md.");
