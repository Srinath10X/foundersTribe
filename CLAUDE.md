# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FoundersTribe is a startup networking platform with a React Native mobile app and a microservices backend. The app has two distinct user experiences — **Founder** and **Freelancer** — switchable via a custom tab bar with animated PagerView transitions.

## Repository Structure

```
apps/mobile/          # Expo React Native app (main codebase)
apps/website/         # Static HTML landing page
services/
  tribe-service/      # Community messaging (Express + Socket.io + Redis)
  voice-service-js/   # Voice chat (Express + LiveKit SDK)
  news-service/       # News/feed service
  founder-match-service/  # Co-founder swipe matching (Express + Redis)
  gig-marketplace-service/  # Gig marketplace (Express + Drizzle ORM + PostgreSQL)
  ai-service/         # AI freelancer search (Express + Groq Llama 3)
infra/                # Docker + Terraform configs
```

Not a formal monorepo (no Turbo/NX/Lerna) — each service has its own package.json and is independently deployable.

## Commands

### Mobile App (apps/mobile/)

```bash
cd apps/mobile
npm install              # Install dependencies
npx expo start           # Start Expo dev server
npx expo run:android     # Run on Android device/emulator
npx expo run:ios         # Run on iOS simulator
npx expo lint            # Run ESLint (eslint-config-expo)
```

### Backend Services (Docker)

```bash
# Start all services locally
docker compose up -d

# Start a specific service
docker compose up -d tribe-service

# Rebuild after code changes
docker compose up -d --build <service-name>
```

Individual service dev mode (from each service directory):
```bash
cd services/<service-name>
npm install
npm run dev    # nodemon (most services) or tsx watch (ai-service, gig-marketplace-service)
```

### Gig Marketplace Service (has database migrations)

```bash
cd services/gig-marketplace-service
npm run db:drizzle:generate   # Generate Drizzle migration files
npm run db:drizzle:migrate    # Run migrations
```

### Mobile Builds (EAS)

```bash
cd apps/mobile
eas build --platform android
eas build --platform ios
```

## Architecture: Role-Based Dual Tabs

The app's navigation is the most architecturally complex part:

```
RootLayout (_layout.tsx) — Stack Navigator
  ├── login, onboarding, branding (auth screens)
  └── (role-pager)/_layout.tsx — PagerView container
        ├── Page 0: (founder-tabs)/_layout.tsx — Bottom tabs
        │     community, home, ai-search, global-search, connections, founder-profile
        └── Page 1: (freelancer-tabs)/_layout.tsx — Bottom tabs
              dashboard, browse-gigs, messages, my-gigs, contract-details, profile
```

- **RoleContext** (`context/RoleContext.tsx`) manages the active role ("founder" | "freelancer"), persisted in AsyncStorage
- **PagerView** (`(role-pager)/_layout.tsx`) holds both tab groups; role switches animate the pager horizontally
- **CustomTabBar** (`components/CustomTabBar.tsx`) renders a Zomato-style pill: tabs on one side, a role-switch pill on the other
- **LiquidTabBar** (`components/LiquidTabBar.tsx`) is the animated bottom tab bar implementation
- Detail flows use separate stacks: `freelancer-stack/` and `talent-stack/`

## State Management

- **No Redux/Zustand** — Context-only: `AuthContext`, `ThemeContext`, `RoleContext`
- **Server state**: TanStack React Query v5 with custom AsyncStorage persistence (`lib/queryCachePersistence.ts`)
- **Auth**: Supabase session-based with OAuth support (`lib/supabase.ts`)
- **Real-time**: Socket.io client for messaging; LiveKit for voice/video rooms

## Key Conventions

- **Routing**: Expo Router (file-based) with `experiments.typedRoutes: true`
- **TypeScript**: Strict mode, path alias `@/*` maps to project root
- **Fonts**: Poppins (UI text), Playfair Display (headings), Bricolage Grotesque
- **Theme**: Dark (#0A0A0B bg) / Light (#FAFAF9 bg) via `useTheme()` from ThemeContext. Brand red: `#CF2030`
- **Design tokens**: `constants/DesignSystem.ts` — use its spacing, typography, and color values
- **Tab bar**: Floating pill design (borderRadius: 999), absolute positioned, 64px height
- **Haptics**: Use `expo-haptics` on interactive elements
- **API wrappers**: All in `lib/` — `tribeApi.ts`, `gigService.ts`, `feedService.ts`, `foundersMatchingService.ts`, `livekit.ts`, `groqAI.ts`
- **Custom hooks**: In `hooks/` — follow existing patterns for data fetching (React Query) and real-time (Socket.io)

## Service Ports

| Service | Port |
|---------|------|
| news-service | 3001 |
| voice-service-js | 3002 |
| tribe-service | 3003 |
| founder-match-service | 3004 |
| gig-marketplace-service | 3005 |
| ai-service | 3006 |
| LiveKit (SFU) | 7880 |
| Redis | 6379 |

## Known TypeScript Issues (Pre-existing)

These type errors exist in the codebase and are not regressions:
- `"tabPress"` event type error in `community.tsx` and `home.tsx` (React Navigation type compat)
- Type errors in `ContextIndicatorPill.tsx` and `NewsCard.tsx`
