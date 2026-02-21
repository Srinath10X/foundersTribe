# Gig Marketplace Service API Routes

This document provides a comprehensive list of all API endpoints implemented in the `gig-marketplace-service`.

## Health

| Method | Route | Description | Auth Required | Request Body | Query Params | Response | Expected Errors |
|---|---|---|---|---|---|---|---|
| GET | `/api/health` | Service health check | No | - | - | `{ status: "ok", service: "gig-marketplace-service" }` | - |

## Gigs

| Method | Route | Description | Auth Required | Request Body | Query Params | Response | Expected Errors |
|---|---|---|---|---|---|---|---|
| POST | `/api/gigs` | Create a new gig. | Yes | `createGigSchema` | - | `{ data: Gig }` | 400 Validation Error, 401 Unauthorized, 500 Internal |
| GET | `/api/gigs` | List and search gigs. | Yes | - | `status`, `tag`, `budget_type`, `budget_min`, `budget_max`, `experience_level`, `startup_stage`, `limit`, `cursor` | `{ items: Gig[], next_cursor: string \| null }` | 400 Validation Error, 401 Unauthorized, 500 Internal |
| GET | `/api/gigs/me` | List gigs created by the current user (founder). | Yes | - | `status`, `tag`, `budget_type`, `budget_min`, `budget_max`, `experience_level`, `startup_stage`, `limit`, `cursor` | `{ items: Gig[], next_cursor: string \| null }` | 400 Validation Error, 401 Unauthorized, 500 Internal |
| GET | `/api/gigs/:id` | Get details of a specific gig by ID. | Yes | - | - | `{ data: Gig }` | 400 Validation Error, 401 Unauthorized, 404 Not Found, 500 Internal |
| PATCH | `/api/gigs/:id` | Update an existing gig (Owner only). | Yes | `updateGigSchema` | - | `{ data: Gig }` | 400 Validation Error, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal |
| DELETE | `/api/gigs/:id` | Delete a gig (Owner only). | Yes | - | - | `204 No Content` | 400 Validation Error, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal |

## Proposals

| Method | Route | Description | Auth Required | Request Body | Query Params | Response | Expected Errors |
|---|---|---|---|---|---|---|---|
| POST | `/api/gigs/:id/proposals` | Submit a proposal to a gig. | Yes | `createProposalSchema` | - | `{ data: Proposal }` | 400 Validation Error, 401 Unauthorized, 500 Internal |
| GET | `/api/gigs/:id/proposals` | List proposals for a specific gig (Owner view). | Yes | - | `limit`, `cursor` | `{ items: Proposal[], next_cursor: string \| null }` | 400 Validation Error, 401 Unauthorized, 500 Internal |
| GET | `/api/proposals/me` | List proposals submitted by the current user (Freelancer view). | Yes | - | `limit`, `cursor` | `{ items: Proposal[], next_cursor: string \| null }` | 400 Validation Error, 401 Unauthorized, 500 Internal |
| POST | `/api/proposals/:id/accept` | Accept a proposal. This creates a contract. | Yes | - | - | `{ data: { contract_id: string } }` | 400 Validation Error, 401 Unauthorized, 404 Not Found, 500 Internal |
| POST | `/api/proposals/:id/reject` | Reject a proposal. | Yes | - | - | `{ data: { success: true } }` | 400 Validation Error, 401 Unauthorized, 404 Not Found, 500 Internal |

## Contracts

| Method | Route | Description | Auth Required | Request Body | Query Params | Response | Expected Errors |
|---|---|---|---|---|---|---|---|
| GET | `/api/contracts` | List contracts for the current user. | Yes | - | `status`, `limit`, `cursor` | `{ items: Contract[], next_cursor: string \| null }` | 400 Validation Error, 401 Unauthorized, 500 Internal |
| GET | `/api/contracts/:id` | Get contract details by ID. | Yes | - | - | `{ data: Contract }` | 400 Validation Error, 401 Unauthorized, 404 Not Found, 500 Internal |
| POST | `/api/contracts/:id/complete` | Mark a contract as complete (typically Freelancer). | Yes | - | - | `{ data: any }` | 400 Validation Error, 401 Unauthorized, 500 Internal |
| POST | `/api/contracts/:id/approve` | Approve a completed contract (typically Founder). | Yes | - | - | `{ data: any }` | 400 Validation Error, 401 Unauthorized, 500 Internal |

## Contract Messages

| Method | Route | Description | Auth Required | Request Body | Query Params | Response | Expected Errors |
|---|---|---|---|---|---|---|---|
| POST | `/api/contracts/:id/messages` | Send a message within a contract context. | Yes | `createMessageSchema` | - | `{ data: Message }` | 400 Validation Error, 401 Unauthorized, 404 Not Found, 422 Unprocessable Entity, 500 Internal |
| GET | `/api/contracts/:id/messages` | List messages for a specific contract. | Yes | - | `limit`, `cursor` | `{ items: Message[], next_cursor: string \| null }` | 400 Validation Error, 401 Unauthorized, 404 Not Found, 422 Unprocessable Entity, 500 Internal |
| POST | `/api/contracts/:id/messages/read` | Mark all unread messages in a contract as read. | Yes | - | - | `{ data: { success: true } }` | 400 Validation Error, 401 Unauthorized, 404 Not Found, 422 Unprocessable Entity, 500 Internal |

## Contract Ratings

| Method | Route | Description | Auth Required | Request Body | Query Params | Response | Expected Errors |
|---|---|---|---|---|---|---|---|
| POST | `/api/contracts/:id/rate` | Submit a rating for a completed contract. | Yes | `createRatingSchema` | - | `{ data: Rating }` | 400 Validation Error, 401 Unauthorized, 500 Internal |

## Notifications

| Method | Route | Description | Auth Required | Request Body | Query Params | Response | Expected Errors |
|---|---|---|---|---|---|---|---|
| GET | `/api/notifications` | List notifications for the current user. | Yes | - | `unread`, `limit`, `cursor` | `{ items: Notification[], next_cursor: string \| null }` | 400 Validation Error, 401 Unauthorized, 500 Internal |
