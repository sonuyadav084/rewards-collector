# Coupon Submission & Verification System (MERN Stack)

A production-ready, enterprise-grade Coupon Submission & Verification platform built from scratch with TypeScript, React, Express, MongoDB, and Docker.

Designed specifically for verifying physical coupons already printed and distributed:
1. **Pre-registration**: Administrators import authorized coupon numbers via CSV or Excel (.xlsx).
2. **Customer Submission**: Customers verify their mobile phone number via OTP, submit a coupon number, and upload a photo of their physical coupon.
3. **Atomic Verification**: Ensures every valid coupon number can be submitted exactly once in its lifetime, with database-level race condition locks and duplicate prevention.
4. **Administrative Review**: Full review lifecycle (Approve / Reject with reason), real-time analytics dashboard, formula-injection-safe CSV export, and complete audit logging.

---

## 1. Technology Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, React Router v6, Axios, Recharts, Lucide React.
- **Backend**: Node.js 20, Express.js, TypeScript, Mongoose ODM, Zod, Helmet, Cookie-Parser, Multer, Winston.
- **Security**: JWT & HTTP-only cookies, Argon2id/bcrypt password hashing, file magic-bytes inspection, CSV formula-injection sanitization (CWE-1236), rate limiting, atomic MongoDB concurrency control.
- **Infrastructure**: MongoDB 7.0, Docker, Docker Compose, Nginx Alpine, Multi-stage builds.

---

## 2. Architecture & Directory Layout

```
.
├── docker-compose.yml          # Production multi-container composition
├── sample-data/
│   └── sample_coupons.csv      # Sample pre-printed coupon codes for testing
├── scripts/
│   └── backup-mongo.sh         # Production MongoDB and photo volume backup script
├── server/
│   ├── Dockerfile              # Multi-stage production container
│   ├── package.json
│   ├── tsconfig.json
│   ├── jest.config.ts
│   ├── .env.example
│   └── src/
│       ├── config/             # Zod environment validation & MongoDB connection
│       ├── models/             # RegisteredCoupon, CouponSubmission, OTPChallenge, AdminUser, AuditLog
│       ├── services/           # AuthService, CouponService, FileStorageService, ImportService, ReportService
│       │   └── sms/            # Pluggable SMS provider interface (Mock & Twilio)
│       ├── controllers/        # Auth, Submissions, Dashboard, Imports, Reports, Audit
│       ├── middleware/         # Auth guards, upload magic-bytes inspection, rate limiters, error handling
│       ├── routes/             # REST API routers
│       ├── utils/              # Normalizers (Coupons & Phones), CSV sanitizers, Logger
│       ├── scripts/seedAdmin.ts# Secure first-time superadmin account initializer
│       └── tests/              # Jest automated unit & integration test suites
└── client/
    ├── Dockerfile              # Multi-stage Vite build + Nginx Alpine runner
    ├── nginx.conf              # SPA routing, security headers & reverse proxy
    ├── package.json
    ├── tailwind.config.js
    ├── vite.config.ts
    └── src/
        ├── api/                # Typed Axios API clients
        ├── context/            # AuthContext (Customer & Admin sessions)
        ├── components/         # Status badges, modals, pagination, navigation
        └── pages/              # Customer submission wizard, customer history, admin dashboard, review table, import wizard
```

---

## 3. Quick Start with Docker (Recommended)

### Prerequisites
- Docker Engine 24+
- Docker Compose v2+

### 1. Configure Environment
Copy and adjust environment variables:
```bash
cp server/.env.example server/.env
```

### 2. Launch the Application
Run Docker Compose in detached mode:
```bash
docker compose up --build -d
```
The stack will initialize on isolated dedicated ports (preventing collisions with other projects):
- **Frontend & Nginx**: `http://localhost:8085` (Port 8085)
- **Backend REST API**: `http://localhost:8085/api` (Internal Proxy) or `http://localhost:5055/api` (Direct)
- **MongoDB**: Internal isolated network on port 27017

### 3. Initialize the First Administrator
Execute the secure admin initialization script inside the backend container (no default passwords):
```bash
docker exec -it coupon-system-backend npm run seed:admin
```
*(Or specify customized credentials: `ADMIN_SEED_EMAIL=admin@mybrand.com ADMIN_SEED_PASSWORD=YourStrongPassword! npm run seed:admin`)*

---

## 4. Local Development Setup (Without Docker)

### Prerequisites
- Node.js 18+ or 20+
- MongoDB 6.0+ running locally on `mongodb://127.0.0.1:27017`

### 1. Setup Backend
```bash
cd server
npm install
cp .env.example .env

# Seed initial administrator
ADMIN_SEED_EMAIL=admin@rewards-coupon.local ADMIN_SEED_PASSWORD=SuperSecurePass123! npm run seed:admin

# Start development server with live reload
npm run dev
```
Backend will start on dedicated port `http://localhost:5055`.

### 2. Setup Frontend
In another terminal:
```bash
cd client
npm install
npm run dev
```
Frontend will start on dedicated port `http://localhost:5185`.

---

## 5. Mobile OTP Verification System

### Pluggable SMS Architecture
The system employs an `ISmsProvider` interface located at `server/src/services/sms/smsProvider.interface.ts`.

Supported providers out of the box:
1. `mock`: Development & local testing provider. Dispatches OTP to server console logs without external network dependencies.
2. `twilio`: Production-ready Twilio REST integration.

### Development Mode vs Production Guardrails
In local development, `ENABLE_DEV_OTP=true` enables test mode with fixed code `DEV_OTP_CODE=123456` or logged to console.

> **CRITICAL SECURITY ENFORCEMENT:**
> When `NODE_ENV=production`, the application configuration strictly rejects startup if `ENABLE_DEV_OTP=true`. The server will immediately abort process execution with a fatal configuration error to prevent unauthorized bypass in live production.

---

## 6. Coupon Lifecycle & Business Rules

1. **Pre-Registration**:
   - Physical coupons have already been printed.
   - Administrators upload coupon numbers through the **Import Coupons** tool using CSV or Excel (.xlsx).
   - The system validates length, allowed characters, and **preserves leading zeros** (e.g. `001248` remains `001248`).
2. **Customer Submission**:
   - Customer verifies their phone number via SMS OTP.
   - Customer submits Name, Coupon Number, and uploads a photo of the physical coupon.
   - The server validates magic bytes of the image file (inspecting raw bytes for `FF D8 FF` for JPEG, `89 50 4E 47` for PNG, etc.) rather than trusting user-provided MIME types or extensions.
3. **Atomic Concurrency Protection**:
   - A single registered coupon can only be submitted **once in its lifetime**.
   - An atomic `findOneAndUpdate` lock with condition `{ normalizedCouponNumber, isSubmitted: false }` guarantees that even if two customers submit the identical coupon at the exact same millisecond, only one transaction can succeed.
4. **Permanent Single-Use**:
   - If a submission is reviewed and marked as **Rejected**, the coupon is **NOT** released for re-submission. Physical coupons cannot be altered or re-used.

---

## 7. Administrative Features

1. **Dashboard & Analytics**:
   - Real-time aggregation of Total Registered, Total Submitted, Pending, Approved, Rejected, and Unique Mobile Phone numbers.
   - Interactive charts of daily submission volume and status distribution.
2. **Submissions Management**:
   - Search by customer name, phone number, coupon number, or reference ID (`SUB-YYYYMMDD-XXXXXX`).
   - Filter by status and date range.
   - Review modal with embedded secure photo streaming.
   - Mandatory rejection reason recording when declining a coupon.
3. **Batch Import (CSV & Excel)**:
   - File upload supporting `.csv`, `.xlsx`, and `.xls`.
   - Real-time preview with validation report: Valid new coupons, invalid rows, file-level duplicates, and already-registered coupons.
   - Downloadable error report CSV.
   - Downloadable sample CSV template.
4. **Sanitized CSV Reports**:
   - Filter by date range and status.
   - Automatic formula-injection prevention (CWE-1236): fields beginning with `=`, `+`, `-`, `@`, `\t` are escaped with leading apostrophes to protect admin spreadsheets from executable macros.
5. **System Audit Logs**:
   - Tracks all administrative actions with actor identity, action type, before/after changes, timestamps, and IP addresses.

---

## 8. Automated Testing

Run the automated test suite covering critical business rules, normalization, concurrency, and security:
```bash
cd server
npm test
```

### Included Tests:
- `couponValidation.test.ts`: Leading zero preservation, uppercase normalization, length checks, invalid character rejection.
- `csvSecurity.test.ts`: Formula-injection protection (CWE-1236), comma quoting, quote escaping.
- `otpVerification.test.ts`: Phone number normalization (E.164), image file magic-bytes inspection, executable spoofing rejection.

---

## 9. Backups & Disaster Recovery

### Creating a Full Backup
Run the backup script from the repository root:
```bash
chmod +x scripts/backup-mongo.sh
./scripts/backup-mongo.sh
```
This generates a timestamped directory under `./backups/` containing:
- `mongo_dump.gz`: Gzipped MongoDB database dump.
- `coupon_uploads.tar.gz`: Compressed archive of all uploaded coupon photo files.

### Restoring from Backup
```bash
# 1. Restore MongoDB Database
docker cp ./backups/<TIMESTAMP>/mongo_dump.gz coupon-system-mongodb:/tmp/mongo_dump.gz
docker exec coupon-system-mongodb mongorestore --db coupon_verification_db --gzip --archive=/tmp/mongo_dump.gz --drop

# 2. Restore Uploaded Photos
docker run --rm \
  -v coupon-system-uploads:/data \
  -v "$(pwd)/backups/<TIMESTAMP>":/backup \
  alpine tar -xzf /backup/coupon_uploads.tar.gz -C /data
```

---

## 10. Production Deployment & Existing-Server Safety

When deploying to an existing VPS or production server:
1. **Isolated Docker Resources**: The system uses unique container names (`coupon-system-backend`, `coupon-system-frontend`, `coupon-system-mongodb`), dedicated volumes, and an isolated bridge network (`coupon-system-network`) to avoid port or container collisions.
2. **Reverse Proxy Configuration**: If deploying behind an existing host Nginx or Traefik, forward traffic for your domain to the frontend container port (`PORT_HTTP=8080` in `.env`).
3. **Non-Root Execution**: Backend and frontend containers run as unprivileged non-root users (`node` and `nginx`).
4. **HTTPS**: Terminate SSL/TLS at your production reverse proxy (e.g., Certbot / Let's Encrypt or Cloudflare) with standard `X-Forwarded-Proto https` headers passed downstream.

