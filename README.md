# 🛒 E-Commerce Inventory Service

A **production-grade inventory management microservice** for e-commerce platforms featuring **real-time stock control**, **reservation-based checkout**, **distributed transactions**, and **automatic expiry handling** to prevent overselling.

---

## 🚀 Overview

The **E-Commerce Inventory Service** is built to solve one of the most critical problems in e-commerce:

✅ **Preventing overselling during high concurrency**

When multiple users try to purchase the same product simultaneously, race conditions can lead to:

- Overselling (inventory goes negative)
- Duplicate reservations
- Stock deduction without payment completion

This service solves it using:

- **Atomic MongoDB transactions**
- **Time-bound inventory reservations**
- **Redis caching + BullMQ expiry jobs**
- **Idempotent confirmation handling**

---

## ✅ Order Flow (Reservation-Based Checkout)

```text
1. CREATE ORDER
   ├─ Validate product + quantity
   ├─ Deduct available stock (transactional)
   ├─ Create reservation (ACTIVE, TTL 5 minutes)
   ├─ Create order (PENDING_PAYMENT)
   ├─ Cache reservation in Redis
   └─ Schedule expiry job via BullMQ

2. PAYMENT PROCESSING
   └─ User completes payment externally

3. CONFIRM ORDER (Idempotent)
   ├─ Validate order status
   ├─ Mark reservation as CONFIRMED
   ├─ Mark order as CONFIRMED
   ├─ Remove Redis key (prevents expiry)
   └─ Stock remains deducted

4. AUTO EXPIRY (BullMQ Worker)
   ├─ Worker detects expired reservation job
   ├─ Double-check Redis TTL
   ├─ Restore stock safely
   ├─ Mark order as EXPIRED
   └─ Release inventory back into available stock
```

---

## ✨ Key Features

### ✅ Real-Time Stock Management

- Prevents overselling using atomic DB operations
- Tracks stock states:
    - `totalStock`
    - `availableStock`
    - `reservedStock`

### ✅ Time-Based Reservation Handling

- 5-minute auto-expiration window for incomplete payments
- Redis cache for fast lookup
- Dual-layer validation (**Redis + MongoDB**) for safety

### ✅ Distributed Transactions (MongoDB Sessions)

- ACID-safe inventory updates
- Reservation + order creation happens as one atomic unit
- Automatic rollback on conflicts

### ✅ Background Expiry Processing

- BullMQ worker restores inventory for expired reservations
- Runs independently as a separate process
- Consistent cleanup for long-running systems

### ✅ Robust Error Handling

- Clean mapping of business errors to HTTP responses
- Consistent JSON response structure
- Clear client-readable messages

### ✅ Idempotent Confirm Operation

- Confirmation can be safely retried
- Prevents duplicate state transitions in edge cases

### ✅ Product Snapshotting

- Order stores product details at checkout time (ex: name, price)
- Protects historical accuracy during price/name changes

---

## 🛠️ Tech Stack

| Component    | Technology         |
| ------------ | ------------------ |
| Runtime      | Node.js            |
| Framework    | Express.js         |
| Database     | MongoDB + Mongoose |
| Cache        | Redis (ioredis)    |
| Queue System | BullMQ             |
| Config       | dotenv             |
| CORS         | cors               |
| Module Type  | CommonJS           |

---

## 📁 Project Structure

```text
e-commerce-inventory-service/
├── app.js                          # Express server entry point
├── package.json                    # Project dependencies & scripts
│
├── config/                         # Configuration modules
│   ├── db.js                       # MongoDB connection setup
│   └── redis.js                    # Redis client initialization
│
├── models/                         # Mongoose data schemas
│   ├── product.model.js            # Product schema (stock management)
│   ├── order.model.js              # Order schema (payment tracking)
│   └── reservation.model.js        # Reservation schema (time-based holds)
│
├── controllers/                    # Request handlers & validation
│   ├── product.controller.js       # GET /products endpoints
│   ├── order.controller.js         # Order CRUD operations
│   └── reservation.controller.js   # Reservation queries
│
├── services/                       # Business logic & transactions
│   ├── order.service.js            # Order creation/confirmation/cancellation
│   └── reservation.service.js      # Reservation lifecycle management
│
├── routes/                         # API endpoints
│   ├── product.route.js            # Product listing endpoints
│   ├── order.route.js              # Order management endpoints
│   └── reservation.route.js        # Reservation query endpoints
│
├── queues/                         # BullMQ job queue setup
│   └── reservation.queue.js        # Reservation expiry queue
│
└── workers/                        # Background job processors
    └── reservationExpiry.worker.js # Expiry job handler & cleanup
```

---

## ⚙️ Getting Started

### ✅ Prerequisites

Make sure you have:

- **Node.js** (v16+ recommended)
- **MongoDB** (Local / Atlas)
- **Redis** (Local / Cloud)
- **npm** or **yarn**

---

### 📥 Installation

#### 1) Clone the repository

```bash
git clone https://github.com/Itsmesachin98/e-commerce-inventory-service.git
cd e-commerce-inventory-service
```

#### 2) Install dependencies

```bash
npm install
```

#### 3) Setup environment variables

Create a `.env` file:

```bash
touch .env
```

Example `.env`:

```env
PORT=3000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/inventory_db
REDIS_URL=redis://:password@hostname:6379
NODE_ENV=development
```

---

## ▶️ Running the Project

### Start the API Server

```bash
node app.js
```

Server runs at:

```text
http://localhost:3000
```

### Start the Reservation Expiry Worker (separate terminal)

```bash
npm run worker:reservation
```

---

## 📄 License

This project is licensed under the **ISC License**.

---

## 👤 Author

Built with ❤️ by **[Sachin Kumar](https://github.com/Itsmesachin98)**

---

## 📞 Support

For bugs, issues, or contributions, please open an issue in the repository.

**Happy coding! 🚀**
