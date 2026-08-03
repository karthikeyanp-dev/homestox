# CLAUDE.md

Guidance for AI assistants working in this repository.

## Project

**HomeStox** — a React Native + Expo app for shared household inventory and shopping. Users belong to "homes", track grocery/household items, generate shopping lists, record purchases with price history, and receive push notifications when housemates make changes.

## Commands

```bash
npm start              # Expo dev server
npm run android        # Run on Android
npm run ios            # Run on iOS
npm run validate       # TypeScript type check (tsc --noEmit)
npm test               # Unit tests (Vitest)
npm run build:preview  # EAS Android preview build
npm run build:prod     # EAS Android production build
```

## Environment

Copy `.env.example` to `.env` and fill in:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_PROJECT_ID` (EAS project ID for push notifications)

## Backend Setup

- Apply the SQL files in `supabase/migrations/` via the Supabase SQL Editor (no automated runner).
- Deploy the Edge Functions:
  - `supabase functions deploy send-home-notification`
  - `supabase functions deploy delete-account`
- Set Supabase secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) for the Edge Functions.

## Repository Layout

- `src/screens/` — feature screens (auth, onboarding, kitchen, market, insights, settings)
- `src/services/` — Supabase data layer (one file per domain)
- `src/store/` — Zustand stores (auth, home, theme, dialog, toast)
- `src/components/` — shared UI components
- `src/navigation/` — root navigator (auth / onboarding / app stacks)
- `supabase/` — migrations + Edge Function

## Conventions

- Shared types live in `src/types/index.ts`.
- Item status is always one of: `'enough' | 'nearing' | 'finished'`.
- Row Level Security is enabled on all tables; the Edge Functions use the service-role key server-side only — never ship it to the client.
- Icons use `MaterialCommunityIcons` from `@expo/vector-icons`.
- External URLs and the support address live in `src/constants/links.ts`. They must match the Play Console listing exactly, so never inline them at the call site.
- The shared `QueryClient` lives in `src/utils/queryClient.ts` (not `App.tsx`) so the auth store can clear it on sign-out and account deletion.

## Account Deletion

Google Play requires both an in-app deletion path and a public web one for any
app that creates accounts. The in-app half is `DeleteAccountDialog` →
`useAuthStore.deleteAccount` → `accountService` → the `delete-account` Edge
Function, which is the only place a user is actually removed.

The function derives the target user from the JWT, never from the request body.
Before deleting the auth user it resolves their memberships, deletes any home
where they were the sole member, and promotes the longest-tenured survivor in
shared homes where they were the only `owner` — RLS gates home management on
that role, so skipping the handover would strand the remaining members.

## Repo Status

Public repo at `github.com/karthikeyanp-dev/homestox`. Never commit secrets — `.env`, `google-services.json`, `docs/`, and `.qoder/` are gitignored. See `.env.example` and `google-services.example.json` for templates.
