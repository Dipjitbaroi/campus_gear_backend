# CampusGear — Sports & Outdoor Gear Rental API

GearUp is a backend REST API for renting sports and outdoor equipment. Customers can browse gear, place and pay for rental orders, track order status, and review completed rentals. Providers can manage inventory and fulfill orders, while administrators manage users, categories, listings, and platform activity.

## Project Resources

- [Video Explanation](https://drive.google.com/file/d/1JC-XyPIfdlmCwGTPDAzYa-yYcdSvIMsT/view?usp=sharing)
- [Entity Relationship Diagram (ERD)](https://drawsql.app/teams/abul-basar/diagrams/gearup)
- [Postman Collection](https://drive.google.com/drive/folders/1LrdmEgzwSOCcKzpbn5v4pihKRe01jZHh?usp=sharing)

## Features

- JWT authentication with access and refresh tokens
- Role-based authorization for `CUSTOMER`, `PROVIDER`, and `ADMIN`
- Public gear browsing with keyword, category, brand, provider, price, active-stock, and date-aware availability filters
- Ordered gear galleries with a backward-compatible primary image
- Paginated gear, order, payment, review, and user listings
- Date-aware inventory checks for overlapping rentals
- Server-calculated rental duration and total price
- Controlled rental status transitions
- Stripe Checkout integration and verified webhook handling
- Reviews tied to rental orders
- Zod request validation and centralized error handling
- PostgreSQL persistence through Prisma ORM

## Technology Stack

- Node.js and Express 5
- TypeScript with ES modules
- PostgreSQL
- Prisma ORM
- Zod
- JSON Web Tokens (JWT)
- bcryptjs
- Stripe Checkout

## Roles and Permissions

| Role | Main permissions |
| --- | --- |
| Customer | Browse gear, create orders, pay, view own orders/payments, cancel eligible orders, and manage own reviews |
| Provider | Create and manage gear, view orders/payments for their gear, and update eligible order statuses |
| Admin | Manage users and categories, manage all gear, view all orders/payments, update order statuses, and remove reviews |

Public registration supports customer and provider accounts only. Admin accounts are created through the protected admin endpoint.

## Rental and Payment Statuses

Rental orders use the following statuses:

```text
PLACED → CONFIRMED → PAID → PICKED_UP → RETURNED
   └─────────────── eligible orders may become CANCELLED
```

Payments use `PENDING`, `COMPLETED`, or `FAILED`. Stripe webhook events update payment records and move confirmed orders to `PAID` after successful payment.

## Getting Started

### Prerequisites

- Node.js 20 or later
- npm
- PostgreSQL
- A Stripe account and Stripe CLI for local webhook testing

### Installation

1. Clone the repository and enter the project directory:

   ```bash
   git clone https://github.com/Dipjitbaroi/campus-gear-backend.git
   cd campus-gear-backend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create the environment file:

   ```bash
   cp .env.example .env
   ```

4. Configure `.env` with your PostgreSQL, JWT, frontend, and Stripe credentials.

5. Apply the database migrations and generate the Prisma client:

   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

6. Start the development server:

   ```bash
   npm run dev
   ```

The API runs at `http://localhost:8080` with the example configuration.

## Environment Variables

| Variable | Description | Example |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:password@localhost:5432/gearup` |
| `PORT` | API server port | `8080` |
| `APP_URL` | Allowed frontend origin for CORS | `http://localhost:3000` |
| `JWT_ACCESS_SECRET` | Secret used to sign access tokens | A long random string |
| `JWT_REFRESH_SECRET` | Secret used to sign refresh tokens | A different long random string |
| `JWT_ACCESS_EXPIRES_IN` | Access-token lifetime | `1h` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh-token lifetime | `7d` |
| `BCRYPT_SALT_ROUNDS` | Password hashing cost | `12` |
| `STRIPE_SECRET_KEY` | Stripe secret API key | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_...` |
| `STRIPE_CURRENCY` | Optional payment currency; defaults to USD | `usd` |

Never commit real secrets or the `.env` file.

## Available Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the API in watch mode |
| `npm run build` | Compile the TypeScript project |
| `npm start` | Run the compiled server |
| `npm run stripe:webhook` | Forward Stripe events to the local webhook endpoint |
| `npm test` | Placeholder; automated tests are not configured yet |

## API Overview

Base URL: `http://localhost:8080/api`

Protected endpoints accept an access token through the `accessToken` cookie or this header:

```http
Authorization: Bearer <access-token>
```

### Authentication

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | Public | Register a customer or provider |
| `POST` | `/auth/login` | Public | Log in and receive tokens |
| `POST` | `/auth/logout` | Public | Clear authentication cookies |
| `POST` | `/auth/refresh-token` | Public | Create a new access token |
| `GET` | `/auth/me` | Authenticated | Get the current user |

### Categories

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/categories` | Public | List categories |
| `POST` | `/categories` | Admin | Create a category |
| `PATCH` | `/categories/:id` | Admin | Update a category |
| `DELETE` | `/categories/:id` | Admin | Delete a category |

Category lists accept an optional case-insensitive `search` query for category names.

### Gear

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/gear` | Public | List and filter gear |
| `GET` | `/gear/price-range` | Public | Get the minimum and maximum gear price per day |
| `GET` | `/gear/:id` | Public | Get one gear item |
| `POST` | `/gear` | Provider, Admin | Create a gear item |
| `PATCH` | `/gear/:id` | Provider, Admin | Update a gear item |
| `DELETE` | `/gear/:id` | Provider, Admin | Delete a gear item |

Gear list query parameters include `providerId`, `search`, `category`, `brand`, `price`, `minPrice`, `maxPrice`, `isAvailable`, `inStock`, `startDate`, `endDate`, `page`, and `limit`. `startDate` and `endDate` must be supplied together as `YYYY-MM-DD`; matching gear must have at least one unit left after overlapping `CONFIRMED`, `PAID`, and `PICKED_UP` quantities are subtracted.

`GET /gear/price-range` aggregates `pricePerDay` across the persisted gear inventory and returns `{ minPrice, maxPrice }`. Both values are `null` when no gear exists.

Gear create/update bodies may include legacy `imageUrl` and an ordered `imageUrls` array of up to four URLs. The first gallery URL is maintained as `imageUrl` for catalog compatibility.

### Rental Orders

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/orders` | Customer, Provider, Admin | List role-scoped orders |
| `POST` | `/orders` | Customer | Place an order |
| `GET` | `/orders/:id` | Customer, Provider, Admin | Get a role-scoped order |
| `PATCH` | `/orders/:id/status` | Customer, Provider, Admin | Update an eligible status |
| `POST` | `/orders/:id/checkout-session` | Customer | Create a Stripe Checkout Session |
| `POST` | `/orders/webhook` | Stripe | Process signed Stripe events |

Order lists support `search`, `status`, `paymentStatus`, `page`, and `limit` query parameters. Search covers gear/brand, customer, provider, and an exact full UUID. Customers see their own orders, providers see orders for their gear, and admins see all orders.

### Payments

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/payments` | Customer, Provider, Admin | List role-scoped payments |
| `GET` | `/payments/:id` | Customer, Provider, Admin | Get a role-scoped payment |

Payment lists support `search`, `status`, `orderStatus`, `page`, and `limit` query parameters. Search covers gear, customer, provider, Stripe references, and an exact full payment/order UUID while role scoping remains authoritative.

### Reviews

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/reviews` | Public | List reviews |
| `GET` | `/reviews/:id` | Public | Get a review |
| `POST` | `/reviews` | Customer | Review an eligible rental order |
| `PATCH` | `/reviews/:id` | Customer | Update an owned review |
| `DELETE` | `/reviews/:id` | Customer, Admin | Delete an owned review or moderate it |

Review lists support `search`, `gearItemId`, exact decimal `rating`, `page`, and `limit` query parameters. Search covers gear, customer, comment, and exact full resource UUIDs.

### User Administration

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/users` | Admin | List and filter users |
| `POST` | `/users/admins` | Admin | Create an admin |
| `GET` | `/users/:id` | Admin | Get a user |
| `PATCH` | `/users/:id/status` | Admin | Set a user to `ACTIVE`, `INACTIVE`, or `SUSPENDED` |
| `PATCH` | `/users/:id` | Admin | Update a user's `name`, `email`, `phone`, and/or `role` |
| `PATCH` | `/auth/me` | Authenticated | Self-service update of the signed-in user's own `name` and/or `phone` |

User lists support `search`, `role`, `status`, `page`, and `limit` query parameters.

`PATCH /users/:id` accepts any non-empty subset of `{ name, email, phone, role }`
and applies the same field rules as registration. Email and phone remain unique,
so a value already held by another account returns `409` naming the offending
field; re-submitting the account's own current values is not a conflict.

Role changes are guarded because a role determines which records an account can
still reach:

- An admin cannot change their own role (`409`), mirroring the self-suspension
  guard on `PATCH /users/:id/status`.
- A `PROVIDER` that still owns gear cannot change role (`409` with the listing
  count); gear mutations require `PROVIDER` or `ADMIN`, so the listings would
  become unmanageable by their owner.
- A `CUSTOMER` with rental orders outside `RETURNED`/`CANCELLED` cannot change
  role (`409` with the order count); checkout and customer-side transitions are
  `CUSTOMER`-only, so an in-flight rental would become unpayable.

Password and account status are not editable here.

`PATCH /auth/me` is the self-service counterpart for any signed-in role. It
resolves the target account from the access token, so it takes no ID, and
accepts a non-empty subset of `{ name, phone }`. Phone remains unique, so a
number held by another account returns `409`. Email is excluded because it is
the login identity, and role and status are excluded because they are
administrative; all three stay with the admin endpoints. The `auth()` middleware
already rejects inactive and suspended accounts.

For complete request bodies and response examples, import the [Postman collection](https://drive.google.com/drive/folders/1LrdmEgzwSOCcKzpbn5v4pihKRe01jZHh?usp=sharing).

## Stripe Webhook Testing

1. Log in through the Stripe CLI:

   ```bash
   stripe login
   ```

2. Forward events to the API:

   ```bash
   npm run stripe:webhook
   ```

3. Copy the displayed `whsec_...` value into `STRIPE_WEBHOOK_SECRET` and restart the server.

The webhook endpoint requires the raw request body, validates Stripe's signature, and handles successful, failed, and expired Checkout Sessions.

## Project Structure

```text
src/
├── app.ts                 # Express app, middleware, and route registration
├── server.ts              # Database connection and HTTP server startup
├── config/                # Environment configuration
├── errors/                # Application error class
├── lib/                   # Prisma and Stripe clients
├── middleware/            # Auth, validation, not-found, and error middleware
├── modules/               # Feature-based controllers, services, routes, and schemas
└── utils/                 # JWT, async handler, and response helpers
prisma/
├── migrations/            # Database migrations
└── schema/                # Split Prisma schema files
```

## Error Responses

Errors are returned as structured JSON. For example:

```json
{
  "success": false,
  "statusCode": 400,
  "name": "Error",
  "message": "Validation failed",
  "errorDetails": []
}
```

## Build Verification

Before submitting or deploying changes, run:

```bash
npm run build
```

## License

This project is licensed under the ISC License.
