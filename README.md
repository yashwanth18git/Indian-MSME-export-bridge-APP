# 🌍 NiryatSetu — Multi-Account Export Management Platform for Indian MSMEs

**Take Indian Craft & Goods Global — Manage All Your Export Entities from One Dashboard.**

NiryatSetu is a multi-tenant, mobile-first export management and global B2B trade platform built specifically for Indian MSMEs, artisans, merchant exporters, and small manufacturers. It streamlines cross-border compliance, multi-currency billing, logistics, and multi-entity operations under a single unified login.

---

## ✨ Key Features

### 🏢 Multi-Account & Multi-Entity Architecture
Indian small-scale exporters frequently operate across multiple legal entities to manage distinct product lines, family sister concerns, or MSME thresholds.
* **Single Login, Instant Entity Switching:** Switch seamlessly between multiple **IECs (Import Export Codes)**, **GSTINs**, and **AD (Authorized Dealer) Bank Accounts** without logging out.
* **Strict Data & Ledger Isolation:** Separate invoice numbering sequences, buyer directories, inventory, **LUT (Letter of Undertaking)** records, and financial ledgers per entity.
* **Consolidated Master Dashboard:** Bird's-eye analytics across all entities (combined revenue, pending receivables, active shipments) with drill-down views per firm.
* **Role-Based Access Control (RBAC):** Granular, entity-level permissions for CAs (GST/BRC access), warehouse managers (packing lists), and sales teams.

### 📄 Automated Indian Export Documentation & Compliance
* **One-Click Document Generation:** Auto-generate compliant **Proforma Invoices (PI)**, **Commercial Invoices (CI)**, **Packing Lists (PL)**, **Certificate of Origin (CoO)** drafts, and **Shipper's Letters of Instruction (SLI)** from a single order entry.
* **GST & LUT Management:** Automated zero-rated export invoicing, LUT expiry alerts, and IGST refund tracking.
* **DGFT & Customs Tracking:** Real-time tracking for **RoDTEP**, **Duty Drawback** claims, and **ICEGATE** shipping bill statuses.
* **FEMA & e-BRC Reconciliation:** Match inward foreign remittances (**FIRC / e-BRC**) against export invoices to ensure timely RBI compliance.
* **Smart ITC-HSN & FTA Lookup:** Built-in Indian ITC-HS code search with destination tariff estimates and Free Trade Agreement (FTA) duty-benefit alerts (India-UAE CEPA, India-Australia ECTA, etc.).

### 💱 Multi-Currency & Trade Finance
* **Live Forex Invoicing:** Quote and bill buyers in `USD`, `EUR`, `GBP`, `AED`, and `AUD` with live exchange rate locking and automated forex gain/loss calculation.
* **Payment & LC Milestone Tracker:** Track advance payments, **DP/DA (Documents Against Payment/Acceptance)**, and **Letter of Credit (LC)** expiry timelines.

### 🚢 Logistics & Buyer Collaboration
* **Freight Comparison & Tracking:** Compare air/sea freight (`FCL`/`LCL`) quotes and track container milestones from factory gate-out to destination port arrival.
* **One-Tap Sharing:** Share branded product catalogs, quotes, and live tracking links via WhatsApp Business or email.

---

## 🏗️ High-Level Architecture (Multi-Tenancy)

```text
User Account (Single Sign-On / Auth)
 ├── Organization / Workspace (Master Dashboard & Billing)
 │    ├── Entity 1: [IEC: XXXXX | GSTIN: 27XXXXX] (e.g., Textiles Division)
 │    │    └── Isolated Ledgers, Invoices, LUTs, Buyers, e-BRCs
 │    └── Entity 2: [IEC: YYYYY | GSTIN: 24XXXXX] (e.g., Agro & Spices Division)
 │         └── Isolated Ledgers, Invoices, LUTs, Buyers, e-BRCs
 └── RBAC Permission Matrix (Owner, CA/Accountant, Logistics, Sales)
