# BiteSpeed
Project For BiteSpeed Backend Intern

      
# Bitespeed Backend Task: Identity Reconciliation

This project is a backend service designed to handle identity reconciliation for Bitespeed, as per the requirements of the backend task. It identifies and consolidates customer contact information (email and phone number) across multiple purchase events.

**Live API Endpoint:** [YOUR_HOSTED_API_ENDPOINT_HERE/api/identify]
*(Example: `https://bitespeed-task-yourname.onrender.com/api/identify`)*

## Table of Contents

- [Problem Statement](#problem-statement)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup and Installation](#setup-and-installation)
  - [Prerequisites](#prerequisites)
  - [Local Development](#local-development)
- [Database Schema](#database-schema)
- [API Endpoint](#api-endpoint)
  - [Request](#request)
  - [Response](#response)
  - [Examples](#examples)
- [Deployment](#deployment)
- [Running Tests (Conceptual)](#running-tests-conceptual)
- [Future Improvements](#future-improvements)

## Problem Statement

FluxKart.com integrates Bitespeed to personalize customer experiences. However, customers (like Doc Brown) might use different email addresses and phone numbers for various purchases. This service provides a way to link these disparate contact details to a single, consolidated customer identity.

The core challenge is to:
- Identify contacts based on incoming email and/or phone number.
- Create new primary contacts if no match is found.
- Link new information as secondary contacts to an existing primary contact.
- Merge identities if an incoming request links two previously separate primary contacts.
- Return a consolidated view of the customer's identity.

## Features

-   **Identity Identification:** Identifies users based on provided email or phone number.
-   **Contact Creation:**
    -   Creates new "primary" contacts.
    -   Creates "secondary" contacts for new information linked to an existing primary contact.
-   **Identity Merging:** If an incoming request links two existing primary contacts, the older contact remains "primary," and the newer one becomes "secondary" (along with its previously linked contacts).
-   **Consolidated Response:** Returns a single JSON object representing the customer's primary contact ID, all associated emails, all associated phone numbers, and IDs of all secondary contacts.

## Tech Stack

-   **Runtime Environment:** Node.js
-   **Language:** TypeScript
-   **Framework:** Express.js
-   **ORM:** Prisma
-   **Database:** MySQL (but designed to be adaptable to other SQL databases supported by Prisma)
-   **Development Tooling:** `ts-node-dev` for live reloading, ESLint/Prettier (recommended)

## Project Structure

    

IGNORE_WHEN_COPYING_START
Use code with caution. Markdown
IGNORE_WHEN_COPYING_END

bitespeed-backend-task/
├── prisma/ # Prisma schema and migrations
│ ├── migrations/
│ └── schema.prisma
├── src/ # Source code
│ ├── controllers/ # Request handlers
│ │ └── identityController.ts
│ ├── routes/ # API route definitions
│ │ └── identityRoutes.ts
│ ├── services/ # Business logic
│ │ └── identityService.ts
│ └── index.ts # Express app entry point
├── .env.example # Example environment variables (DO NOT COMMIT .env)
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
└── tsconfig.json

      
## Setup and Installation

### Prerequisites

-   Node.js (v16 or newer recommended)
-   npm (or yarn)
-   A running MySQL instance (or other SQL database compatible with Prisma)
-   Git

### Local Development

1.  **Clone the repository:**
    ```bash
    git clone [YOUR_GITHUB_REPOSITORY_URL]
    cd bitespeed-backend-task
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root of the project by copying `.env.example` (if you provide one) or manually:
    ```bash
    cp .env.example .env
    ```
    Or create `.env` and add:
    ```env
    DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE_NAME"
    # Example: DATABASE_URL="mysql://root:your_password@localhost:3306/bitespeed_identity"

    PORT=3000 # Optional, defaults to 3000
    ```
    Replace `USER`, `PASSWORD`, `HOST`, `PORT`, and `DATABASE_NAME` with your actual database credentials.

4.  **Run database migrations:**
    This will create the database if it doesn't exist and apply the schema.
    ```bash
    npx prisma migrate dev
    ```

5.  **Generate Prisma Client:**
    (Usually run automatically after `migrate dev`, but good to know)
    ```bash
    npx prisma generate
    ```

6.  **Start the development server:**
    ```bash
    npm run dev
    ```
    The server will typically start on `http://localhost:3000`.

## Database Schema

The primary table used is `Contact`:

```prisma
model Contact {
  id             Int            @id @default(autoincrement())
  phoneNumber    String?
  email          String?
  linkedId       Int?           // ID of the primary Contact if this is secondary
  linkPrecedence LinkPrecedence // "primary" or "secondary"
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  deletedAt      DateTime?      // For soft deletes (optional)

  // Self-relation for linkedId
  linkedContact  Contact?  @relation("ContactLinks", fields: [linkedId], references: [id])
  linkedFrom     Contact[] @relation("ContactLinks")

  @@index([email])
  @@index([phoneNumber])
  @@index([linkedId])
}

enum LinkPrecedence {
  primary
  secondary
}
