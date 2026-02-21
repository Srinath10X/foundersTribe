# Gig Marketplace API Endpoints

Base path: `/api`

## Health
- `GET /health`

## Users
- `GET /users/me`
- `PUT /users/me`

## Gigs
- `POST /gigs`
- `GET /gigs?filters`
- `GET /gigs/me`
- `GET /gigs/stats`
- `GET /gigs/:id`
- `PATCH /gigs/:id`
- `DELETE /gigs/:id`

## Proposals
- `POST /gigs/:id/proposals`
- `GET /gigs/:id/proposals`
- `GET /proposals/me`
- `POST /proposals/:id/accept`
- `POST /proposals/:id/reject`

## Contracts
- `GET /contracts`
- `GET /contracts/:id`
- `POST /contracts/:id/complete`
- `POST /contracts/:id/approve`

## Messages
- `POST /contracts/:id/messages`
- `GET /contracts/:id/messages?cursor`
- `POST /contracts/:id/messages/read`

## Ratings
- `POST /contracts/:id/rate`

## Notifications
- `GET /notifications`
