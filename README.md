# Unity Bridge Platform Backend

A Node.js/Express backend for the Unity Bridge Platform, providing user and project management, volunteer/donor workflows, admin dashboards, and payment handling via SSLCommerz.

## Features

- REST API for users and projects
- MongoDB integration with `mongodb` driver
- User registration and profile management
- Project creation, update, verification, and volunteer/donor tracking
- Admin and NGO dashboard summary endpoints
- Payment gateway support using `sslcommerz-lts`

## Requirements

- Node.js 18+ or compatible
- MongoDB Atlas account or MongoDB connection URI
- SSLCommerz account credentials

## Installation

1. Clone the repository or copy files into `Backend`
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the project root with the required values:

```env
PORT=5050
NAME=<mongo-username>
PASS=<mongo-password>
STORE_ID=<sslcommerz-store-id>
STORE_PASS=<sslcommerz-store-password>
IS_SANDBOX=true
```

4. Start the server:

```bash
npm start
```

## Available Scripts

- `npm start` - starts the server with `nodemon`

## Environment Variables

- `PORT` - port to run the server on (default: `5050`)
- `NAME` - MongoDB username
- `PASS` - MongoDB password
- `STORE_ID` - SSLCommerz store ID
- `STORE_PASS` - SSLCommerz store password
- `IS_SANDBOX` - set to `false` for live payments, `true` for sandbox

## API Endpoints

- `GET /` - health check
- `GET /users` - list all users
- `GET /projects` - list all projects
- `GET /projects/:id` - get project by ID
- `POST /users` - register new user
- `POST /projects` - create new project
- `PUT /users/verify-status/:id` - update user verification status
- `PUT /projects/:id` - update project details
- `PUT /projects/volunteerrequest/:id` - add volunteer request
- `PUT /projects/applicant-status/:id` - update applicant status
- `PUT /projects/verify-status/:id` - verify or reject a project
- `PUT /projects/update-contributor-status/:projectId` - update volunteer/donor status
- `PUT /users/update-profile/:email` - update user profile
- `GET /admin/dashboard-summary` - admin dashboard metrics
- `GET /ngo/dashboard-summary` - NGO dashboard metrics
- `GET /user/volunteer-donor-summary` - volunteer/donor summary
- `POST /payment/initiate` - initiate payment
- `POST /payment/success/:tranId` - payment success callback
- `POST /payment/fail/:tranId` - payment failure callback
- `POST /payment/cancel/:tranId` - payment canceled callback

## Notes

- The MongoDB URI is built from environment variables in `index.js`.
- Update callback URLs in `index.js` when deploying to production.
- Ensure `sslcommerz-lts` credentials are valid for your payment environment.
