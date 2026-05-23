# 🤖 Receptionly — AI Receptionist SaaS

> A multi-tenant SaaS that gives any business a 24/7 AI receptionist — answering calls, booking appointments, and capturing leads automatically.

---

## 📌 Table of Contents

- [🤖 Receptionly — AI Receptionist SaaS](#-receptionly--ai-receptionist-saas)
  - [📌 Table of Contents](#-table-of-contents)
  - [Overview](#overview)
  - [Features](#features)
    - [Phase 1 — MVP](#phase-1--mvp)
    - [Phase 2 — Growth](#phase-2--growth)
    - [Phase 3 — Pro](#phase-3--pro)
  - [Tech Stack](#tech-stack)
  - [Architecture](#architecture)
    - [Call Flow](#call-flow)
  - [Firebase Data Model](#firebase-data-model)
  - [Project Structure](#project-structure)
  - [Admin Panel](#admin-panel)
    - [Admin Features](#admin-features)
    - [Admin Data Model](#admin-data-model)
    - [Admin Routes](#admin-routes)
    - [Admin Tech Notes](#admin-tech-notes)
  - [Environment Variables](#environment-variables)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
    - [Firebase Functions (Local)](#firebase-functions-local)
  - [Roadmap](#roadmap)
    - [Q1 — Foundation](#q1--foundation)
    - [Q2 — Integrations](#q2--integrations)
    - [Q3 — Scale](#q3--scale)
  - [Pricing Model](#pricing-model)
  - [Contributing](#contributing)
  - [License](#license)

---

## Overview

**Receptionly** lets businesses sign up, configure an AI voice agent (name, personality, FAQs, calendar), get a dedicated phone number, and go live — all without writing a single line of code.

Built for:
- Clinics & dental offices
- Law firms
- Real estate agencies
- Salons & spas
- Any small-to-mid business that receives calls

---

## Features

### Phase 1 — MVP
- [x] Multi-tenant auth & onboarding (Clerk)
- [x] AI agent builder (name, greeting, tone, FAQs)
- [x] Phone number provisioning per tenant (Twilio)
- [x] Voice AI call handling (Vapi)
- [x] Call logs — transcript, summary, outcome, duration
- [x] Stripe subscription billing
- [x] Dashboard with call history

### Phase 2 — Growth
- [ ] Google Calendar & Calendly integration
- [ ] SMS follow-up after calls
- [ ] Live call transfer to human agent
- [ ] CRM webhook export (HubSpot, GoHighLevel)
- [ ] Analytics — call volume, outcomes, peak hours
- [ ] Multi-agent support per tenant

### Phase 3 — Pro
- [ ] White-label (custom domain + branding)
- [ ] API access for enterprise clients
- [ ] Usage-based billing (per minute overage)
- [ ] Voicemail + transcription
- [ ] Multi-language auto-detection

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Next.js 14 (App Router) | Full-stack React framework |
| **UI** | Tailwind CSS + shadcn/ui | Styling and components |
| **Auth** | Clerk | Multi-tenant authentication |
| **Database** | Firebase Firestore | NoSQL real-time database |
| **Storage** | Firebase Storage | Call recordings, assets |
| **Functions** | Firebase Cloud Functions | Webhooks, background jobs |
| **Voice AI** | Vapi | AI voice agent engine |
| **Phone** | Twilio | Phone number provisioning & routing |
| **Calendar** | Google Calendar API | Appointment booking |
| **Payments** | Stripe | Subscriptions + usage billing |
| **SMS** | Twilio SMS | Post-call follow-up messages |
| **Email** | Resend | Transactional emails |
| **Hosting** | Vercel | Frontend deployment |

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│                    FRONTEND                       │
│              Next.js 14 — Vercel                  │
│   Dashboard | Onboarding | Agent Builder | Calls  │
└───────────────────────┬──────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────┐
│              NEXT.JS API ROUTES                   │
│  /api/agents   /api/calls   /api/phone            │
│  /api/webhooks/vapi   /api/webhooks/stripe        │
└────────┬──────────────┬──────────────┬────────────┘
         │              │              │
┌────────▼──────┐ ┌─────▼──────┐ ┌────▼───────────┐
│   Firebase    │ │    Vapi    │ │    Twilio       │
│   Firestore   │ │ Voice Agent│ │  Phone Numbers  │
│   Storage     │ │    API     │ │   SMS           │
│   Functions   │ └────────────┘ └────────────────┘
└───────────────┘
         │
┌────────▼──────────────────────┐
│   Stripe        │   Resend    │
│   Billing       │   Email     │
└───────────────────────────────┘
```

### Call Flow

```
📞 Incoming call hits Twilio number
          ↓
🔀 Twilio webhook → /api/webhooks/twilio
          ↓
🤖 Vapi agent picks up & handles conversation
          ↓
📋 Vapi webhook → /api/webhooks/vapi
          ↓
🔥 Call summary + transcript saved to Firestore
          ↓
📱 SMS follow-up sent to caller (optional)
          ↓
📊 Dashboard updated in real time
```

---

## Firebase Data Model

```
/tenants/{tenantId}
  - name: string
  - email: string
  - plan: "starter" | "growth" | "pro"
  - phoneNumber: string        // Twilio number
  - stripeCustomerId: string
  - stripeSubscriptionId: string
  - createdAt: timestamp

/tenants/{tenantId}/agents/{agentId}
  - name: string              // e.g. "Lisa from Bright Dental"
  - greeting: string
  - tone: "friendly" | "professional" | "casual"
  - language: string          // default "en"
  - faqs: [{ question, answer }]
  - calendarUrl: string
  - vapiAgentId: string       // synced Vapi agent ID
  - isActive: boolean
  - createdAt: timestamp

/tenants/{tenantId}/calls/{callId}
  - callerNumber: string
  - agentId: string
  - duration: number          // seconds
  - outcome: "booked" | "transferred" | "message" | "unanswered"
  - summary: string
  - transcript: string
  - recordingUrl: string
  - createdAt: timestamp

/tenants/{tenantId}/integrations/{service}
  - service: "google_calendar" | "hubspot" | "gohighlevel"
  - accessToken: string
  - refreshToken: string
  - connectedAt: timestamp
```

---

## Project Structure

```
/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/
│   │   └── sign-up/
│   ├── (dashboard)/
│   │   ├── dashboard/          # Overview & stats
│   │   ├── agents/             # Agent builder
│   │   │   ├── new/
│   │   │   └── [agentId]/
│   │   ├── calls/              # Call logs & transcripts
│   │   ├── integrations/       # Calendar, CRM connections
│   │   └── settings/           # Billing, account, phone
│   ├── (admin)/                # Admin panel (superuser only)
│   │   ├── layout.tsx
│   │   ├── admin/              # Admin overview
│   │   ├── tenants/            # All tenant accounts
│   │   │   └── [tenantId]/     # Individual tenant detail
│   │   ├── calls/              # Platform-wide call logs
│   │   ├── billing/            # Stripe revenue & subscriptions
│   │   └── system/             # Feature flags, config, health
│   ├── onboarding/             # First-time setup wizard
│   └── api/
│       ├── agents/
│       ├── calls/
│       ├── phone/
│       ├── admin/              # Admin-only API routes
│       │   ├── tenants/
│       │   ├── impersonate/
│       │   └── metrics/
│       └── webhooks/
│           ├── vapi/
│           ├── twilio/
│           └── stripe/
│
├── components/
│   ├── ui/                     # shadcn components
│   ├── agent-builder/          # FAQ editor, voice config
│   ├── call-log/               # Transcript viewer, filters
│   └── dashboard/              # Stats cards, charts
│   └── admin/                  # Admin-specific components
│       ├── TenantTable.tsx
│       ├── RevenueChart.tsx
│       ├── SystemHealth.tsx
│       └── ImpersonateBanner.tsx
│
├── lib/
│   ├── firebase.ts             # Firebase client init
│   ├── firebase-admin.ts       # Firebase Admin SDK
│   ├── vapi.ts                 # Vapi API wrapper
│   ├── twilio.ts               # Twilio helpers
│   ├── stripe.ts               # Stripe helpers
│   └── utils.ts
│
├── hooks/
│   ├── useAgent.ts
│   ├── useCalls.ts
│   └── useTenant.ts
│
├── types/
│   └── index.ts                # Shared TypeScript types
│
├── firebase/
│   ├── firestore.rules         # Security rules
│   └── functions/              # Cloud Functions
│       ├── src/
│       │   ├── vapiWebhook.ts
│       │   ├── stripeWebhook.ts
│       │   └── callSummary.ts
│       └── package.json
│
├── public/
├── .env.local
├── firebase.json
├── firestore.rules
├── next.config.ts
├── tailwind.config.ts
└── README.md
```

---

## Admin Panel

The admin panel is a superuser-only area accessible at `/admin`. It is completely separate from the tenant-facing dashboard and is protected by a Clerk-based role check (`role === "admin"`) enforced in both middleware and individual API routes.

> ⚠️ Admin routes must **never** be accessible to regular tenants. All admin API routes verify the superuser role server-side before processing any request.

### Admin Features

| Feature | Description |
|---|---|
| **Tenant Overview** | List all registered tenants with plan, status, usage, and MRR contribution |
| **Tenant Detail** | Drill into a single tenant — their agents, call history, billing status, and account health |
| **Impersonation** | Log in as any tenant (read-only view) for support and debugging without knowing their credentials |
| **Platform Call Logs** | View all calls across every tenant — filterable by date, outcome, agent, and tenant |
| **Revenue Dashboard** | Stripe MRR, churn rate, plan distribution, and recent subscription events |
| **Usage Monitoring** | Per-tenant minute consumption vs plan limits; flag accounts approaching overage |
| **Feature Flags** | Enable or disable features per tenant or globally without a deploy |
| **System Health** | Vapi, Twilio, and Stripe API status; Firebase usage; webhook error rates |
| **Audit Log** | Immutable log of all admin actions (impersonation, plan changes, deletions) |

### Admin Data Model

```
/admins/{userId}
  - email: string
  - role: "superadmin" | "support"
  - createdAt: timestamp

/platform/metrics
  - totalTenants: number
  - activeTenants: number
  - totalCallsToday: number
  - totalMinutesToday: number
  - mrr: number
  - updatedAt: timestamp

/auditLog/{logId}
  - adminId: string
  - action: "impersonate" | "plan_change" | "tenant_delete" | "feature_flag"
  - targetTenantId: string
  - metadata: object
  - createdAt: timestamp

/featureFlags/{flagId}
  - name: string
  - enabled: boolean
  - enabledForTenants: string[]   // tenant-specific overrides
  - description: string
  - updatedAt: timestamp
  - updatedBy: string             // adminId
```

### Admin Routes

```
GET  /api/admin/metrics              # Platform-wide stats
GET  /api/admin/tenants              # Paginated tenant list
GET  /api/admin/tenants/[id]         # Single tenant detail
PATCH /api/admin/tenants/[id]        # Update plan, status, limits
DELETE /api/admin/tenants/[id]       # Permanently delete tenant

POST /api/admin/impersonate          # Generate scoped session token
DELETE /api/admin/impersonate        # End impersonation session

GET  /api/admin/calls                # All platform calls (paginated)
GET  /api/admin/billing              # Stripe revenue summary

GET  /api/admin/flags                # List all feature flags
PATCH /api/admin/flags/[flagId]      # Toggle flag globally or per tenant

GET  /api/admin/system/health        # Third-party API status checks
```

### Admin Tech Notes

- **Auth guard:** Clerk `auth().protect()` + custom `isAdmin()` check on every admin API route and in `middleware.ts` for all `(admin)` layout routes.
- **Impersonation:** Generate a short-lived Firestore token scoped to one tenant's data. The `ImpersonateBanner` component renders persistently during an impersonation session with a one-click exit.
- **Audit logging:** Every mutating admin API action writes to `/auditLog` via a shared `logAdminAction()` helper before returning a response.
- **Feature flags:** Checked server-side via a `getFlag(flagName, tenantId?)` utility. Client-side flag state is passed as props or via a context provider — never fetched directly from Firestore on the client.
- **Role separation:** `"superadmin"` can delete tenants and change plans. `"support"` role can impersonate and view logs but cannot mutate billing or delete accounts.

---

## Environment Variables

Create a `.env.local` file in the root:

```bash
# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Firebase (Client)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase (Admin — server only)
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# Vapi
VAPI_API_KEY=
VAPI_WEBHOOK_SECRET=

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Resend
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Admin
ADMIN_CLERK_ROLE=admin                # Clerk role metadata key value
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- Firebase CLI (`npm install -g firebase-tools`)
- Accounts: Firebase, Clerk, Vapi, Twilio, Stripe

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/yourname/receptionly.git
cd receptionly

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Fill in all values in .env.local

# 4. Set up Firebase
firebase login
firebase init   # Select Firestore, Functions, Storage

# 5. Deploy Firestore security rules
firebase deploy --only firestore:rules

# 6. Run locally
npm run dev
```

### Firebase Functions (Local)
```bash
cd firebase/functions
npm install
npm run serve
```

---

## Roadmap

### Q1 — Foundation
- Project setup & auth
- Agent builder & Vapi integration
- Twilio number provisioning
- Call logging to Firestore
- Stripe billing

### Q2 — Integrations
- Google Calendar booking
- SMS follow-up
- Live transfer
- Analytics dashboard

### Q3 — Scale
- White-label support
- API access
- Usage billing
- Mobile app (React Native)

---

## Pricing Model

| Plan | Price | Minutes | Agents | Numbers |
|---|---|---|---|---|
| **Starter** | $49/mo | 100 min | 1 | 1 |
| **Growth** | $149/mo | 500 min | 3 | 3 |
| **Pro** | $349/mo | 2,000 min | Unlimited | 10 |
| **Overage** | $0.08/min | Beyond plan | — | — |

---

## Contributing

Pull requests are welcome. For major changes, open an issue first.

```bash
git checkout -b feature/your-feature
git commit -m "feat: your feature description"
git push origin feature/your-feature
```

---

## License

MIT © 2026 Receptionly