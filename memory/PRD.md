# Mayank Store Khata — PRD

## Overview
A mobile ledger app for **Mayank Store** (Indian kirana/shop) to track receivables (paisa lena) and payables (paisa dena) per customer/supplier. Bilingual (English default, Hindi toggle). PIN-secured. Cloud-backed via FastAPI + MongoDB.

## Users
- Single shop-owner user (Mayank Store owner). Later usable for staff by rotating PIN.

## Auth
- 4-digit PIN. On first launch prompts to set PIN. Stored as bcrypt hash server-side. Change PIN available from Settings.

## Core Features
1. **Dashboard** — Total To Receive (green) / To Pay (red) cards, reminders banner, search parties, party list with per-party balance.
2. **Add Party** — Name (required), Phone, Address, Firm Name, Contact Person, GST Number (all optional), plus **Opening Balance** with type toggle (To Receive / To Pay / None). Opening balance is stored as a seed transaction so the running balance is always derived from transactions.
3. **Party Detail** — Balance card, action buttons (Call, Send Reminder), extra info card (firm/contact/GST/address), transaction history, sticky bottom buttons "You Gave" / "You Got".
4. **Add Transaction** — Amount, Note, Date (defaults to today). Screen tinted red for "You Gave", green for "You Got".
5. **Reminders** — List of parties with positive balance (customers who owe money). Direct WhatsApp share per party with pre-filled polite reminder in current language.
6. **Send Reminder** (from party detail) — Bottom sheet with WhatsApp / SMS choice; uses `whatsapp://` and `sms:` deep links.
7. **Settings** — Language toggle (English / Hindi), Change PIN modal, Monthly PDF Report generator (uses `expo-print` + `expo-sharing`), Lock App.
8. **Monthly Report** — Client-side HTML → PDF built from `/api/report/monthly` data. Includes totals (Gave/Got/Net) and row-by-row transactions.

## Tech
- Frontend: Expo Router, React Native, TypeScript, expo-print, expo-sharing, expo-haptics, expo-secure-store, safe-area-context.
- Backend: FastAPI, Motor (Async MongoDB), passlib+bcrypt.
- Currency: INR (₹). All monetary values formatted with Indian locale.

## Design
- Brand: Rust Orange `#E05A33`. Success green `#16A34A` for receivables. Error red `#DC2626` for payables. iOS-Native Clean personality. No blue/purple. Large touch targets (≥44pt). Solid utility UI (no glassmorphism).

## Non-Goals
- Multi-shop / multi-tenant.
- Biometric / OTP login (user chose PIN only).
- Barcode / inventory tracking.
- Real SMS gateway (uses device SMS intent instead).
