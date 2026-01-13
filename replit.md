# TM Imports / Tecle Motos - Sistema ERP Multi-Empresa

## Overview

This project is a comprehensive multi-company ERP system designed for TM Imports (headquarters) and its Tecle Motos franchises. It specializes in the management of electric motorcycles and scooters, encompassing products, inventory, sales, and financial operations. The system aims to streamline business processes, provide a unified platform for managing multiple franchise locations, and support all key operational aspects from product cataloging to financial reconciliation and auditing.

**Key Capabilities:**
- Multi-company and franchise management
- Product and service catalog with automated pricing
- Centralized and per-store inventory management with transfers
- End-to-end sales workflow with approvals and accounts receivable generation
- Complete service order management
- Comprehensive financial management (AR/AP, cash flow, bank reconciliation)
- Purchase request system for franchises from headquarters
- Detailed audit logging of all system actions
- Advanced fiscal document management (NF-e, NFC-e, NFS-e)
- Granular permission system replacing traditional roles

## User Preferences

- I prefer a clean and intuitive UI/UX.
- The system should be robust and scalable to handle multiple franchises.
- Data integrity and security are paramount.
- The development process should prioritize modularity and maintainability.
- Provide clear and concise explanations for any complex changes or features.
- I expect a high level of detail in any proposed solution or architecture.
- I prefer that the agent asks for confirmation before making significant structural changes to the database or core architecture.

## System Architecture

The system is built on a modern web stack with a focus on a Single Page Application (SPA) experience.

**UI/UX Decisions:**
- **Color Scheme:** Dark theme with a black/graphite background (`#1a1a1a`), accented with orange (`#FF6B35`) for TM Imports identity and neon green (`#00FF88`) for electric energy representation.
- **Frontend:** EJS templates for initial rendering, custom CSS, and a JavaScript SPA for dynamic interactions.
- **Dynamic Elements:** Menus and dashboards adapt based on user permissions.

**Technical Implementations:**
- **Backend:** Node.js with Express.js framework.
- **Database:** PostgreSQL as the relational database, managed with Sequelize ORM.
- **Authentication:** JSON Web Tokens (JWT) for secure, stateless authentication with a 24-hour expiration.
- **Authorization:** A granular, direct permission system where capabilities are assigned per user, replacing traditional role-based access control. Permissions are organized into 17 modules with 53 granular permissions. An `ADMIN_GLOBAL` user bypasses all permission checks.
- **State Management:** SPA approach minimizes page reloads.
- **Charting:** Chart.js for data visualization on dashboards.
- **Security:** bcryptjs for password hashing, multi-tenancy enforced by filtering data based on company/store context.

**Feature Specifications:**
- **User Profiles:** `ADMIN_GLOBAL`, `GESTOR_FRANQUIA`, `OPERACIONAL`, each with distinct access levels and dashboard views. The new permission system offers finer control than these legacy profiles.
- **Sales Flow:** Multi-stage sales process (PENDING, APPROVED, CONCLUDED, CANCELED) with inventory deduction and accounts receivable generation upon conclusion.
- **Purchase Requests:** Franchises can request products from the central inventory, subject to `ADMIN_GLOBAL` approval.
- **Bank Reconciliation:** Automated and manual reconciliation of bank statements (OFX, CSV, Excel imports) to manage financial transactions.
- **Fiscal Module:** Comprehensive management of electronic fiscal documents (NF-e, NFC-e, NFS-e) including creation, cancellation, correction, and integration with external fiscal APIs.
- **Dashboards:** Multiple dashboards catering to different user types (Global, Franchise, Operational, Financial, Salesperson), dynamically populated based on user permissions and offering period-based filtering (Weekly, Monthly, Total).
- **Settings:** Global system settings (discounts, payment terms, card fees) configurable by `ADMIN_GLOBAL`.
- **PWA Support:** Progressive Web Application features (manifest.json, service worker) for mobile installation and offline capabilities.
- **Auditing:** Extensive logging of all critical actions and denied access attempts.

## External Dependencies

- **Database:** PostgreSQL
- **ORM:** Sequelize
- **Web Framework:** Express.js
- **Authentication:** jsonwebtoken (JWT)
- **Password Hashing:** bcryptjs
- **Charting Library:** Chart.js
- **Fiscal APIs (Optional Integration):** Focus NFe, PlugNotas, Nuvem Fiscal (for NF-e, NFC-e, NFS-e emission)