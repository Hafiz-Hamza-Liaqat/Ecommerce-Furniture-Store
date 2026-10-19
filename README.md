<p align="center">
  <img src="packages/web/public/icons/rlf-192.svg" alt="Rao Liaqat Furniture Store Logo" width="96" height="96" />
</p>

# Furniture-Store and B-2-B service Platform
### Rao Liaqat Furniture Store (RLF Store) / Artisan Furnish Hub

> Enterprise furniture business operating system, omni-channel e-commerce storefront, and B2B trade service platform.

---

## 📌 Overview

**Rao Liaqat Furniture Store (RLF Store / Artisan Furnish Hub)** is an enterprise-grade platform designed for end-to-end furniture retail, custom manufacturing, commercial interior fit-outs, and B2B contract trade. Built as a modular TypeScript monorepo, it unites customer-facing digital experiences with mission-critical ERP, CRM, inventory, supply chain, and manufacturing operations.

---

## 🌟 Key Features

### 🛍️ Omni-Channel Commerce & B2B Portal
- **Interactive Storefront & Catalog**: Browse room-by-room collections, configure finishes, fabrics, and dimensions.
- **Budget Planner & Fitout Estimator**: Real-time room packages and presentation estimates with catalogue-grounded SKUs and printable specifications.
- **B2B Trade & Quotations**: Commercial procurement workflows, bulk discounting, and formal sales quotation generation.
- **Client Workspace**: Customer portals for project tracking, specification downloads, invoices, and service requests.

### 🏭 Enterprise ERP & Manufacturing Operations
- **Inventory & Multi-Warehouse**: Real-time stock levels, warehouse transfer orders, reserved allocations, and serial tracking.
- **Manufacturing & Work Centers**: Production orders, Bill of Materials (BOM), work center routing, and progress tracking.
- **Procurement & Vendor Management**: Purchase requisitions, purchase orders, vendor evaluation, and goods receipt notes.
- **Financial Ledger & Invoicing**: Commercial invoicing, ledger tracking, tax calculation, and payment reconciliation.

### 📋 Project & Field Service Management
- **Interior Fit-Out Projects**: Milestones, task lifecycles, and cross-team execution pipelines.
- **Field Service & Warranty**: Service tickets, maintenance work orders, warranty claims, and scheduled inspections.

### 🛡️ Platform Foundation & Governance
- **Workflow & Approval Engine**: Configurable stage transitions, multi-level approvals, escalation policies, and SLA breach monitors.
- **Multi-Tenant Identity & RBAC**: Granular role-based access control, field-level and record-level authorization, session management, and MFA.
- **Durable Messaging & Outbox**: At-least-once event delivery, transactional outbox/inbox, poison-message handling, and dead-letter queues.
- **Digital Asset Management (DAM)**: Centralized media versioning, metadata extraction, and safe upload validation.
- **Audit & Observability**: Correlation IDs across all layers, structured JSON logging, health probes, and automated backup/restore verification.

---

## 🏗️ Architecture & Monorepo Structure

The project is structured as an npm workspaces monorepo:

```
├── packages/
│   ├── shared-kernel/           # Core domain primitives, result types, paging, and configuration contracts
│   ├── persistence/             # Repository patterns, unit of work, and outbox/inbox storage interfaces
│   ├── persistence-sql/         # SQLite persistence engine with schema migrations and integrity validation
│   ├── identity/                # Multi-tenant RBAC, permission catalogs, session service, and MFA
│   ├── identity-providers/      # External identity and authentication adapters
│   ├── platform/                # Workflow state machine, approval engines, SLA guards, and projections
│   ├── infrastructure/          # Event bus, logging, secret providers, and observability adapters
│   ├── messaging-broker/        # Durable message queue broker with DLQ and poison thresholding
│   ├── commerce/                # Storefront catalog, pricing rules, and cart domain models
│   ├── sales/                   # Sales orders, quotations, and contract management
│   ├── procurement/             # Purchase orders, supplier tracking, and receiving
│   ├── inventory/               # Warehouse locations, stock tracking, and reservations
│   ├── manufacturing/           # Production orders, BOM, and assembly work centers
│   ├── finance/                 # Billing, invoicing, ledgers, and transactions
│   ├── projects/                # Turnkey interior fitouts, milestones, and task trees
│   ├── service/                 # Post-delivery support, tickets, and field maintenance
│   ├── crm/                     # Accounts, client leads, and partner relationship management
│   ├── cms/                     # Content management, marketing articles, and editorial pages
│   ├── dam/                     # Digital Asset Management core domain
│   ├── reporting/               # Executive intelligence and reporting engines
│   ├── search/                  # Full-text indexing and query execution
│   ├── notifications/           # Event notification dispatch and template processing
│   ├── *-application/           # CQRS command/query application services for each domain
│   ├── api/                     # Node HTTP REST API, routing, security headers, rate limiting
│   ├── web/                     # React 19 + TypeScript + Vite SPA frontend and ERP portal
│   └── runtime-host/            # Unified production runtime host, lifecycle management, health checks
├── docs/                        # Architecture specs, validation reports, and release audits
└── scripts/                     # Operational scripts and database utilities
```

---

## 💻 Tech Stack

- **Frontend**: React 19, TypeScript, Vite, CSS Modules / Custom Tokens, Vitest
- **Backend / API**: Node.js (>=20), TypeScript, Native Node HTTP, Custom CQRS Application Layer
- **Persistence**: SQLite (Node.js native SQLite driver) with transactional outbox and automated snapshotting
- **Messaging**: Event-driven transactional outbox pattern with durable in-memory / SQL queue brokers
- **Security**: Granular RBAC, RFC-7807 problem details, Content Security Policy (CSP), HSTS, CORS validation, zero-secret repository hygiene
- **Testing**: Vitest, Node.js Native Test Runner (`node --test`), Playwright E2E suites

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v20.0.0` or higher (tested on `v22.21.1`)
- **npm**: `v10.0.0` or higher (tested on `v10.9.4`)

### Installation

Clone the repository and install workspace dependencies:

```bash
git clone https://github.com/Hafiz-Hamza-Liaqat/Ecommerce-Furniture-Store.git
cd Ecommerce-Furniture-Store
npm install
```

### Environment Configuration

Copy the example environment configuration template:

```bash
cp .env.example .env
```

Review and configure the variables in `.env`:

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `AFH_PROFILE` | Runtime profile (`development`, `testing`, `staging`, `production`) | `development` |
| `AFH_PORT` | HTTP API port | `8080` |
| `AFH_HOST` | Host address binding | `0.0.0.0` |
| `AFH_CORS_ORIGIN` | Allowed CORS origins (comma-separated) | `http://localhost:5173,http://127.0.0.1:5173` |
| `AFH_DATABASE_PATH` | Path to primary SQLite database file | `./data/afh.sqlite` |
| `AFH_BROKER_DATABASE_PATH`| Path to messaging broker database | `./data/broker.sqlite` |
| `AFH_REQUIRE_SECRETS` | Require production-grade secrets on boot | `false` (dev) / `true` (prod) |
| `AFH_SECRET_JWT_SIGNING_KEY` | Secret key for JWT signing (≥ 32 chars) | `REPLACE_WITH_32_PLUS_CHAR_SECRET` |

---

## 🛠️ Build and Development

### Compile Monorepo Packages

Build all 42 packages in topological order:

```bash
npm run build
```

### Type Checking

Run TypeScript type check across all monorepo packages:

```bash
npm run typecheck
```

### Linting

Lint all source code using ESLint:

```bash
npm run lint
```

### Running the Web Frontend

```bash
npm run dev -w @afh/web
```

The frontend application will be available at `http://localhost:5173`.

### Running the API Host

```bash
npm run start -w @afh/runtime-host
```

---

## 🧪 Verification & Testing

The repository contains comprehensive unit, integration, and security test suites.

### Run All Unit & Integration Tests

```bash
# Run web application tests (Vitest)
npm run test -w @afh/web

# Run core API route and transport tests
npm run test -w @afh/api

# Run application & platform engine tests
npm run test -w @afh/application
npm run test -w @afh/identity
npm run test -w @afh/platform
```

### Production Readiness & Verification Checks

```bash
# Verify release readiness, secrets validation, and migrations
npm run verify -w @afh/runtime-host

# Verify system resilience and security hardening
npm run harden -w @afh/runtime-host

# Run full acceptance verification suite
npm run accept -w @afh/runtime-host
```

---

## 📄 License & Attribution

All rights reserved © **Rao Liaqat Furniture Store**. Proprietary business software.
