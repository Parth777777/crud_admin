# ☁️ Deploying Foodly to AWS — Services & Architecture Plan

This is the "next step" plan for taking Foodly from your laptop to AWS. It maps
every part of the app to an AWS service, gives you **three deployment tiers**
(pick based on how much you want to learn vs. how fast you want to ship), and
lists the **exact code changes** needed to make the app cloud-ready.

> Nothing here is wired up yet — it's a roadmap. When you pick a tier, I can
> scaffold the Dockerfiles / IaC / CI for it.

---

## 1. What Foodly is made of (and what each piece needs in the cloud)

| Foodly piece | Today (local) | What it needs in the cloud |
|---|---|---|
| React client (`client/`) | Vite dev server :5173 | Static file hosting + CDN |
| Express API (`server/`) | Node process :4000 | A place to run Node + a public URL |
| SQLite DB (`foodly.db`) | a file on disk | Durable, managed storage |
| JWT secret | `.env` | A secrets store |
| Recipe/meal images | external URLs | (optional) file uploads → object storage |
| TheMealDB calls | outbound HTTPS | just outbound internet — no change |

---

## 2. Service mapping (the menu)

| Concern | AWS service | Why |
|---|---|---|
| **Host the React build** | **S3** (static site) + **CloudFront** (CDN/TLS) | Cheap, fast, global. Classic SPA hosting. |
| …or all-in-one | **AWS Amplify Hosting** | Git push → build → deploy, TLS included. Simplest. |
| **Run the Express API** | **ECS Fargate** (containers) behind an **ALB** | No servers to manage; scales horizontally. |
| …simpler | **AWS App Runner** or **Elastic Beanstalk** | Point at a container/repo, it runs it. |
| …cheapest | **Lightsail** or a single **EC2** instance | One small box runs Node + SQLite. |
| …serverless | **Lambda + API Gateway** | Pay-per-request; needs an Express→Lambda adapter. |
| **Relational database** | **Amazon RDS (PostgreSQL)** | Managed SQL — the natural upgrade from SQLite. |
| …serverless DB | **Aurora Serverless v2** or **DynamoDB** | Auto-scaling. DynamoDB = NoSQL (changes data model). |
| **Secrets (JWT_SECRET)** | **Secrets Manager** or **SSM Parameter Store** | Never bake secrets into images. |
| **Image uploads** (optional) | **S3** + presigned URLs (+ CloudFront) | Real file uploads instead of URL fields. |
| **DNS + TLS certs** | **Route 53** + **ACM** | Custom domain + free HTTPS certificates. |
| **Logs & metrics** | **CloudWatch** | API logs, error alarms, dashboards. |
| **CI/CD** | **GitHub Actions** → **ECR** + ECS/S3 deploy | Build image, push, roll out. |
| **Infra as code** | **AWS CDK** (TypeScript) or **Terraform** | Reproducible infra; CDK matches our TS stack. |
| **Managed auth** (alt) | **Amazon Cognito** | Replaces our hand-rolled JWT if you want a managed option. |

---

## 3. Three deployment tiers — pick one

### Tier 1 — "Just get it online" (cheapest, fastest to learn)
```
Browser → CloudFront → S3 (React build)
Browser → /api → Lightsail/EC2 (Node + Express + SQLite on the same box)
```
- Frontend: `npm run build -w client` → upload `client/dist` to **S3**, front with **CloudFront**.
- Backend: one **Lightsail** instance (or `t3.micro` EC2) running the Node server with **Nginx/Caddy** in front for TLS; SQLite file lives on the instance disk.
- DB: keep **SQLite** (fine for one instance / low traffic).
- Secrets: an `.env` on the box (or SSM Parameter Store).
- ✅ Cheapest, simplest. ❌ One box = no horizontal scaling; back up the SQLite file (e.g. cron → S3).

### Tier 2 — "Proper, scalable" (recommended)
```
Browser → CloudFront → S3                      (React build)
Browser → CloudFront/ALB → ECS Fargate         (Express container, 1–N tasks)
                              │
                              ├── RDS PostgreSQL        (data)
                              ├── Secrets Manager       (JWT secret, DB creds)
                              └── S3 + CloudFront        (uploaded images)
Route 53 + ACM for the domain & TLS · CloudWatch for logs/alarms
```
- Backend runs as a **container on Fargate** (no servers), behind an **ALB** using our existing `GET /api/health` as the health check.
- DB migrates **SQLite → RDS PostgreSQL** (see §4).
- Secrets come from **Secrets Manager** at runtime.
- ✅ Scales, resilient, production-shaped. ❌ More moving parts, higher cost (~ a few $/day; RDS is the main cost).

### Tier 3 — "Serverless" (pay-per-use, more refactor)
```
Browser → CloudFront → S3                      (React build)
Browser → API Gateway → Lambda                 (Express via adapter)
                           ├── DynamoDB or Aurora Serverless v2
                           └── Secrets Manager / SSM
(optional) Amazon Cognito for auth
```
- Wrap Express with an adapter (`@codegenie/serverless-express`) so it runs in **Lambda**.
- **SQLite can't be used on Lambda** (ephemeral, multi-instance) → use **DynamoDB** (NoSQL rewrite) or **Aurora Serverless v2 + RDS Proxy**.
- ✅ Scales to zero, cheap at low traffic. ❌ Cold starts; biggest code change.

---

## 4. Code changes to make Foodly AWS-ready

These are ordered; each is independently useful.

1. **Externalize config** *(already mostly done)*
   - We already read `JWT_SECRET`, `PORT`, etc. from env. In the cloud, inject
     them from **Secrets Manager / SSM** instead of a file. No code change beyond
     ensuring nothing is hard-coded.

2. **Add a Dockerfile for the server** (Tiers 2 & 3-ish)
   - Multi-stage Node 20 image; run `tsx src/index.ts`; expose `4000`. The ALB
     health check hits the existing `/api/health`.

3. **Make the database swappable: SQLite → PostgreSQL** (Tiers 2 & 3)
   - Today we use `better-sqlite3` with raw SQL in `server/src/db.ts` and the
     routes. To move to **RDS Postgres**, introduce a thin data layer (or swap to
     a query builder like **Knex** / an ORM like **Prisma** / **Drizzle**).
   - Most of our SQL is standard; the main edits: `AUTOINCREMENT` → `SERIAL`/
     `IDENTITY`, `datetime('now')` → `now()`, and `?` placeholders → `$1, $2`.
   - This is the single biggest task for horizontal scaling, because **SQLite
     can't be shared across multiple API instances** — RDS can.

4. **(Optional) Real image uploads via S3** (ties into the admin "change photos")
   - Add `POST /api/admin/uploads/sign` → returns an **S3 presigned URL**; the
     browser uploads the file straight to S3; we store the resulting CloudFront
     URL in `image_url`. Replaces (or augments) the current "image URL" field.

5. **CORS / base URL**
   - Locally, Vite proxies `/api`. In the cloud, set the API's CORS `origin` to
     your CloudFront domain, and point the client at the API URL (build-time env
     `VITE_API_URL`, or keep same-origin via CloudFront path routing `/api/*`).

6. **Static build pipeline**
   - `npm run build -w client` emits `client/dist`. Deploy = `aws s3 sync` +
     CloudFront cache invalidation (done in CI).

---

## 5. CI/CD (GitHub Actions sketch)

```
on push to main:
  build-client:  npm ci → npm run build -w client → aws s3 sync dist → CloudFront invalidate
  build-api:     docker build server → push to ECR → ECS update-service (rolling deploy)
```
Use an IAM **OIDC role** for GitHub Actions (no long-lived AWS keys).

---

## 6. Rough cost intuition (us-east-1, low traffic)

- **Tier 1:** Lightsail $3.50–$5/mo + S3/CloudFront pennies → **~$5/mo**.
- **Tier 2:** RDS (`db.t4g.micro`) is the main cost (~$12–15/mo) + Fargate (~$10–
  20/mo for 1 small always-on task) + CloudFront/S3 → **~$30–45/mo**. Scales with
  use. Free tier covers a lot in year 1.
- **Tier 3:** near-$0 at idle; you mostly pay per request + DynamoDB/Aurora.

(Always confirm with the AWS Pricing Calculator — numbers drift.)

---

## 7. Suggested order to actually do it

1. **Tier 1 first** — get the static client on S3+CloudFront and the API on one
   Lightsail box with SQLite. You'll learn S3, CloudFront, TLS, and deployment
   without database migration pain.
2. **Add the Dockerfile** and move the API to **App Runner / Fargate** (still
   pointing at… see next).
3. **Migrate SQLite → RDS Postgres** (the real "production" step).
4. **Add Secrets Manager, Route 53 + ACM, CloudWatch alarms.**
5. **Add S3 image uploads** and **GitHub Actions** CI/CD.
6. (Optional) Explore **Cognito** to compare managed auth vs. our JWT, and
   **Lambda** for serverless.

---

### Want me to start?
Tell me which tier and I'll scaffold it in the repo — e.g. a `server/Dockerfile`,
an **AWS CDK** app under `infra/`, the **Postgres** data layer, and the **GitHub
Actions** workflow. We can do it incrementally, same as we built the app.
