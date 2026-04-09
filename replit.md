# TM Imports / Tecle Motos - Sistema ERP Multi-Empresa

## Overview

This project is a comprehensive multi-company ERP system for TM Imports and its Tecle Motos franchises, specializing in electric motorcycle and scooter management. It provides robust solutions for products, inventory, sales, and financial operations across multiple stores within a group, including advanced features like automated warranty generation, detailed financial tracking, and an extensive role-based access control system. The system aims to provide a scalable, secure, and intuitive platform for managing franchise operations efficiently.

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
- **Components:** Custom UI component library for reusable elements.
- **UI/UX Decisions:**
    - Global store selector for consolidated or per-store views.
    - Responsive design for dashboards and data tables.
    - Inline modals and panels for quick actions (e.g., creating clients/suppliers, inventory transfers).
    - Dedicated menus and dashboards for specific roles (e.g., TECNICO, ADMIN_FINANCEIRO).

### Backend (server/)
- **Runtime:** Node.js 22, TypeScript (tsx)
- **Web Framework:** Express.js
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Authentication:** JWT with bcryptjs for password hashing.
- **Key Features & Design Patterns:**
    - **Multi-tenancy:** Strict isolation for data access based on user's assigned store/group.
    - **RBAC:** Granular role-based access control with 7 predefined roles.
    - **Inventory Management:** Centralized and per-store inventory, inter-store transfers, weighted average cost calculation, audit logs, and stock visibility controls based on roles.
    - **Sales & CRM:** End-to-end sales workflow, automated accounts receivable, warranty generation, client/supplier management with interaction timelines (CRM).
    - **Financial Management:** Comprehensive AR/AP, cash flow, bank reconciliation (OFX import), automated payment generation from purchase orders, and a configurable chart of accounts.
    - **Fiscal Module:** Management of incoming/outgoing Notas Fiscais with detailed fiscal fields.
    - **Automated Reporting:** Role-based email reports with XLSX attachments and scheduled delivery.
    - **WhatsApp CRM:** Template-based messaging system for various contexts, bulk dispatch, and quick access from client/supplier records.
    - **Sequential Codes:** Automated generation and normalization of sequential IDs for OS, Products.

### Color Scheme
- Background: `#09090b` (zinc-950)
- Card/Panel: `#18181b` (zinc-900)
- Border: `#27272a` (zinc-800)
- Accent: `#f97316` (orange-500)
- Success: `#22c55e` (green-500)
- Error: `#ef4444` (red-500)

## External Dependencies

- **Database:** PostgreSQL (managed by Neon)
- **ORM:** Prisma
- **Web Framework:** Express.js
- **Authentication:** `jsonwebtoken` (JWT)
- **Password Hashing:** `bcryptjs`
- **Excel/CSV Processing:** `xlsx`
- **Email/Scheduling:** `node-cron`, `nodemailer` (via SMTP)