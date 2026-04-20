# TM Imports / Tecle Motos - ERP Multi-Empresa

## Overview

This project is a comprehensive multi-company ERP system designed for TM Imports and its Tecle Motos franchises, specializing in electric motorcycle and scooter management. It provides robust solutions for products, inventory, sales, and financial operations across multiple stores within a group. Key capabilities include automated warranty generation, detailed financial tracking, and an extensive role-based access control system. The system aims to provide a scalable, secure, and intuitive platform for managing franchise operations efficiently, supporting business growth and market expansion in the electric mobility sector.

## User Preferences

- Clean and intuitive UI/UX with dark theme
- Robust and scalable system for multiple franchises
- Data integrity and security are paramount
- Modularity and maintainability in development
- Ask confirmation before significant structural changes

## System Architecture

### Frontend (client/)
- **Framework:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS v4
- **State Management:** React Context API
- **Components:** Custom UI component library.
- **UI/UX Decisions:**
    - Global store selector for consolidated or per-store views.
    - Responsive design for dashboards and data tables.
    - Inline modals and panels for quick actions.
    - Dedicated menus and dashboards for specific roles.
    - Color Scheme: Background (`#09090b`), Card/Panel (`#18181b`), Border (`#27272a`), Accent (`#f97316`), Success (`#22c55e`), Error (`#ef4444`).

### Backend (server/)
- **Runtime:** Node.js 22, TypeScript (tsx)
- **Web Framework:** Express.js
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Authentication:** JWT with bcryptjs.
- **Key Features & Design Patterns:**
    - **Multi-tenancy:** Strict data isolation based on user's assigned store/group.
    - **RBAC:** Granular role-based access control with 7 predefined roles, controlling access to features and data (e.g., cost visibility).
    - **Inventory Management:** Centralized and per-store inventory, inter-store transfers, weighted average cost, audit logs, and role-based stock visibility. Includes features for individual unit tracking (chassis), bulk parts, and import/manual entry.
    - **Sales & CRM:** End-to-end sales workflow, automated accounts receivable, warranty generation, client/supplier management with interaction timelines. Includes lead management with automatic assignment by region and "pass the baton" functionality.
    - **Financial Management:** Comprehensive AR/AP, cash flow, bank reconciliation (OFX import), automated payment generation from purchase orders, and configurable chart of accounts.
    - **Fiscal Module:** Management of incoming/outgoing Notas Fiscais with detailed fiscal fields.
    - **Automated Reporting:** Role-based email reports with XLSX attachments and scheduled delivery.
    - **WhatsApp CRM:** Template-based messaging system, bulk dispatch, and quick access from client/supplier records.
    - **Sequential Codes:** Automated generation and normalization of sequential IDs for OS, Products.
    - **API Patterns:** Consistent use of an `api` service for requests; named exports/imports; careful handling of legacy fields.

## External Dependencies

- **Database:** PostgreSQL (managed by Neon)
- **ORM:** Prisma
- **Web Framework:** Express.js
- **Authentication:** `jsonwebtoken` (JWT)
- **Password Hashing:** `bcryptjs`
- **Excel/CSV Processing:** `xlsx`
- **Email/Scheduling:** `node-cron`, `nodemailer` (via SMTP)