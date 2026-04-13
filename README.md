# 🛒 E-Commerce Inventory Service

A **production-grade inventory management microservice** designed to handle **high-concurrency e-commerce scenarios** with **zero overselling guarantees**.

Built with a focus on **scalability, consistency, and fault tolerance**, this service implements **reservation-based checkout**, **distributed transactions**, and **automated recovery mechanisms**.

---

## 🚀 Live API Documentation

👉 **Test the API here:**  
🔗 https://e-commerce-inventory-service.onrender.com/api-docs

- Interactive Swagger UI
- Try endpoints directly from the browser
- Explore request/response schemas

---

## 🎯 Problem Statement

In high-traffic e-commerce systems, concurrent purchase attempts can lead to:

- ❌ Overselling (negative inventory)
- ❌ Race conditions
- ❌ Inconsistent order states
- ❌ Stock loss due to failed payments

---

## 💡 Solution

This service ensures **strong consistency and reliability** using:

- **Atomic MongoDB transactions**
- **Reservation-based inventory locking**
- **Redis-backed caching layer**
- **BullMQ-powered background processing**
- **Idempotent order confirmation**

---

## 🔄 Order Lifecycle (Reservation-Based Checkout)

```text
1. CREATE ORDER
   ├─ Validate product & stock
   ├─ Deduct available stock (atomic)
   ├─ Create reservation (TTL: 5 min)
   ├─ Create order (PENDING_PAYMENT)
   ├─ Cache in Redis
   └─ Schedule expiry job via BullMQ

2. PAYMENT PROCESSING
   └─ User completes payment externally

3. CONFIRM ORDER (Idempotent)
   ├─ Validate order status
   ├─ Mark reservation CONFIRMED
   ├─ Mark order CONFIRMED
   ├─ Remove Redis key
   └─ Finalize stock deduction

4. AUTO EXPIRY (BullMQ Worker)
   ├─ Worker detects expired reservation job
   ├─ Double-check Redis TTL
   ├─ Restore stock
   ├─ Mark order EXPIRED
   └─ Release inventory back into available stock
```

---

## ✨ Key Features

### 🧠 Strong Consistency & Concurrency Control

- Prevents overselling using **ACID-compliant transactions**
- Handles concurrent requests safely at scale

### ⏳ Time-Bound Reservations

- 5-minute reservation window
- Automatic expiry & recovery
- Dual validation (**Redis + MongoDB**)

### 🔁 Idempotent Operations

- Safe retry for order confirmation
- Eliminates duplicate state transitions

### ⚡ High-Performance Caching

- Redis used for:
    - Reservation lookups
    - Expiry validation
    - Reduced DB load

### 🔄 Background Job Processing

- BullMQ worker restores expired inventory
- Ensures system self-healing

### 📦 Product Snapshotting

- Order stores product data at purchase time
- Prevents inconsistencies due to future updates

### 🛡️ Robust Error Handling

- Clean, consistent API responses
- Clear business error mapping

---

## 🛠️ Tech Stack

| Component    | Technology         |
| ------------ | ------------------ |
| Runtime      | Node.js            |
| Framework    | Express.js         |
| Database     | MongoDB + Mongoose |
| Cache        | Redis (ioredis)    |
| Queue System | BullMQ             |
| API Docs     | Swagger/OpenAPI    |
| Config       | dotenv             |

---

## 📁 Project Architecture

```text
e-commerce-inventory-service/
├── app.js
├── config/
├── models/
├── controllers/
├── services/
├── docs/
├── routes/
├── queues/
└── workers/
```

### Architecture Highlights:

- **Layered design** (Controller → Service → Model)
- **Separation of concerns**
- **Scalable microservice structure**
- **Background worker isolation**

---

## ⚙️ Setup & Installation

### ✅ Prerequisites

Make sure you have:

- **Node.js** (v16+)
- **MongoDB** (Local / Atlas)
- **Redis** (Local / Cloud)

---

### 📥 Installation

#### Clone the repository

```bash
git clone https://github.com/Itsmesachin98/e-commerce-inventory-service.git
cd e-commerce-inventory-service
npm install
```

#### Setup environment variables

Create a `.env` file:

```env
PORT=3000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/inventory_db
REDIS_URL=redis://:password@hostname:6379
NODE_ENV=development
```

---

## ▶️ Running the Application

### Start API Server

```bash
node app.js
```

Server runs at:

```text
http://localhost:3000
```

### Start Background Worker (separate terminal)

```bash
npm run worker:reservation
```

### API Documentation

The API is fully documented using Swagger. Access the interactive documentation at:

```text
http://localhost:3000/api-docs
```

This provides:

- Complete endpoint documentation
- Request/response schemas
- Interactive API testing
- Schema definitions for all models

---

## 📊 Why This Project Stands Out

This is not a basic CRUD project. It demonstrates:

- ✅ Real-world **e-commerce system design**
- ✅ Handling **race conditions & concurrency**
- ✅ Understanding of **distributed systems**
- ✅ Experience with **background processing & queues**
- ✅ Writing **production-ready backend architecture**

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
