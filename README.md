# NextLayer Studio Ecosystem

A Netlify-oriented website starter based on the supplied visual references: premium black/purple NextLayer Studio pages and a black/white/racing-red ISRO Racing division. Includes static public pages, Netlify Functions, Supabase schema/RLS, admin console, quote and driver-application workflows, public reference lookup, and optional server-side Gemini/OpenAI calls.

## Honest implementation status

This is a working deployment foundation, not a claim that every feature in the master prompt is fully production-complete. The public website and core forms are implemented. The backend functions persist quote enquiries and driver applications to Supabase when configured. The admin console provides Supabase-authenticated CRUD for the listed starter modules subject to database RLS. The schema includes additional entities for race results, private documents, offline payments, votes, reports, media, and audit records.

Still requires further implementation before a full production launch: secure private document upload/retrieval workflow; audited medical-clearance interface; complete event participant/result scoring workflow; certificate PDF/QR issuance; vote abuse/rate limiting; email delivery; comprehensive audit triggers; full test coverage; and privacy/legal review. Do not claim those features are complete. The app intentionally does not collect online payments and does not integrate Claude, Razorpay, or Stripe.

## Stack

- Static HTML/CSS/JavaScript in `public/`
- Netlify Functions (Node 20)
- Supabase Postgres + Auth + Row Level Security
- Optional Gemini or OpenAI server-side integration
- No production database is stored in local files or in-memory arrays

## Local setup

1. Install Node.js 20 or newer.
2. Create a Supabase project.
3. Open the Supabase SQL Editor and run `database/schema.sql`.
4. Create an administrator through Supabase Auth. Public sign-up is not provided by this site.
5. Add a role row for that user's UUID using the SQL Editor, for example:

   ```sql
   insert into public.admin_roles(user_id, role)
   values ('YOUR_AUTH_USER_UUID', 'super_admin');
   ```

6. Create `public/assets/config.js` from the example below (or configure the same object before `site.js` and `admin.js` load). Only the Supabase URL and anon/public key belong here:

   ```js
   window.NEXTLAYER_CONFIG = {
     supabaseUrl: "https://YOUR_PROJECT.supabase.co",
     supabaseAnonKey: "YOUR_SUPABASE_ANON_KEY"
   };
   ```

   Include it in `index.html` and `admin.html` before their local JS scripts. The anon key is designed for browser use; security depends on RLS policies. Never put the service-role key in the browser.

7. Copy `.env.example` to `.env` for local function development and fill the values you actually use. Never commit `.env`.
8. Install and run:

   ```bash
   npm install
   npm run build
   npm test
   npx netlify dev
   ```

## Netlify deployment

- Build command: `npm run build`
- Publish directory: `public`
- Functions directory: `netlify/functions`
- Node runtime: 20
- Set environment variables in **Site configuration → Environment variables**, then redeploy.
- Netlify does not automatically upload your local `.env` file.

Required for enquiry and application persistence:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; grants elevated database access, so keep private)

Required for browser directory/admin:
- `NEXTLAYER_CONFIG` is not read from a Netlify environment variable automatically by static JavaScript. Create `public/assets/config.js` with `window.NEXTLAYER_CONFIG` as shown above and include it in both HTML pages. This is a public config file and must contain only the Supabase URL and anon key.

Optional AI:
- `AI_PROVIDER=gemini` and `GEMINI_API_KEY`, optionally `AI_MODEL`
- or `AI_PROVIDER=openai`, `OPENAI_API_KEY`, optionally `OPENAI_MODEL`

Optional hardening:
- `ALLOWED_ORIGIN` should be the canonical deployed origin, e.g. `https://your-site.netlify.app`. This is origin checking, not a substitute for rate limiting or bot protection.

## Functions

- `POST /api/submit-enquiry` — validates and stores a quote enquiry
- `POST /api/register-driver` — validates and stores a driver application
- `GET /api/application-status?reference=...` — looks up application or certificate status without exposing applicant contact details
- `POST /api/ai-chat` — optional Gemini/OpenAI server-side request

Function paths are mapped in `netlify.toml`.

## Data and privacy notes

- The service-role key is used only inside serverless functions. Do not expose it.
- Public driver rows are served from `drivers_public`, which includes only published profiles and omits medical data.
- Do not publish medical diagnoses or private documents. Clearance needs explicit authorization and consent.
- `application-status` reveals only the status/reference/date fields, but a production implementation should add a second verification factor or email challenge before enabling public status lookups at scale.
- The schema has an intentionally public certificate lookup surface; keep certificate rows limited to public certificate fields.
- Offline admission payments only: “Admission payments are collected in person in Pune during the admission process. No online payment is accepted through this website. Contact the organization to confirm your admission appointment, applicable fee, and official payment instructions.”
- Add a trusted email provider only after configuring it and checking delivery failures. No email is claimed as sent by the current implementation.

## Admin notes

Admin sign-in uses Supabase Auth. There is no public admin signup or hardcoded password. A user must exist in Supabase Auth and have an `admin_roles` row. RLS policies control database access. The general admin editor intentionally excludes medical notes and private document management.

The starter admin editor exposes only selected fields per module. Test each role with a non-super-admin account before production. SQL RLS should be reviewed by a qualified engineer, especially the public certificate read policy and any custom changes.

## Tests and limitations

Run `npm run build` for a structural build check and `npm test` for unit tests of validation/helper behavior. A successful structural build does not prove Netlify deployment, database connectivity, AI provider credentials, or production security. Those require configured services and manual testing.

Before launch, implement/verify: request rate limits and CAPTCHA/Turnstile; server-side duplicate protection; full database migrations; audit triggers for sensitive changes; private object storage policies; email challenge for application status; upload malware/content checks; accessibility audit; dependency audit; backup/restore drill; and end-to-end tests.

## Legal and brand note

ISRO here means **International Speedway Racing Organization** as described by the site owner; this website does not claim affiliation with the Indian Space Research Organisation or with Formula 1, NASCAR, or any other external racing organization. Replace placeholder organization details and publish legal policies reviewed for your jurisdiction.
