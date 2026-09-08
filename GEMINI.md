# Project Overview

This is a comprehensive procurement management platform built with Node.js, TypeScript, Express, and MongoDB. This system streamlines the entire procurement workflow from requisition creation through vendor bidding to purchase order fulfillment and delivery.

**Key Technologies:**

* **Backend:** Node.js, Express, TypeScript
* **Database:** MongoDB with Mongoose
* **Authentication:** JWT (JSON Web Tokens)
* **Real-time Communication:** WebSockets (socket.io)
* **File Storage:** AWS S3
* **API Documentation:** Swagger

## Building and Running

**Prerequisites:**

* Node.js (v16+)
* MongoDB
* pnpm (or npm/yarn)

**Installation:**

1. Clone the repository.
2. Install dependencies:

    ```bash
    pnpm install
    ```

3. Set up environment variables by creating a `.env` file in the root directory (see `.env.example`).

**Running the application:**

* **Development:**

    ```bash
    pnpm run dev
    ```

* **Production:**

    ```bash
    pnpm start
    ```

**Building the application:**

```bash
pnpm run build
```

**Testing:**

The project currently has a placeholder test script. To run tests, you would typically use a command like:

```bash
pnpm test
```

## Development Conventions

* **Code Style:** The project uses ESLint for code linting. Run `pnpm run lint` to check for style issues.
* **Branching:** The `README.md` suggests a feature-branch workflow for contributions.
* **API Documentation:** The API is documented using Swagger. The documentation is available at the `/api-docs` endpoint.
* **Modularity:** The code is organized into modules by feature (e.g., `auth`, `requisitions`, `vendors`).
