# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important: Expo version

Always read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code. APIs change between Expo versions and guessing will cause errors.

## Commands

```bash
npm run web        # Start dev server for browser (Chrome at localhost:8081 or 8082)
npm run android    # Start for Android
npm run ios        # Start for iOS
npm run lint       # Run ESLint
npm test           # Run Jest tests
```

**Windows-specific:** `npm run web` must be run from `cmd` (not PowerShell) due to execution policy restrictions. The `metro.config.js` sets `maxWorkers: 1` to avoid a Windows `EPERM` error when Metro tries to fork child processes — do not remove this.

## Architecture

**ProAgenda** — mobile/web MVP for independent professionals (psychologists, nutritionists, coaches, etc.) to manage clients, appointments, and finances. No backend — all data is mock/local state.

### Routing (Expo Router v6, file-based)

```
app/
  _layout.tsx           # Root Stack: declares (tabs) and paciente/[id]
  (tabs)/
    _layout.tsx         # Tab bar: 4 tabs → index, explore, calendario, finanzas
    index.tsx           # Dashboard
    explore.tsx         # Patient list
    calendario.tsx      # Appointments / agenda
    finanzas.tsx        # Finances
  paciente/
    [id].tsx            # Patient profile (dynamic route)
```

Navigation to the patient profile: `router.push('/paciente/PATIENT_ID' as any)`.

### Data layer

Data is stored in **Supabase** (Postgres) and fetched via **React Query** with **AsyncStorage** persistence for offline/cache-first reads. `constants/MockData.ts` still holds the TypeScript types but no longer contains data — it is the type source of truth only.

- `lib/supabase.ts` — Supabase client (uses AsyncStorage for auth session persistence)
- `lib/queries.ts` — all raw Supabase fetch/insert/update/delete functions
- `context/AuthContext.tsx` — auth session state; exposes `user`, `session`, `signIn`, `signUp`, `signOut`
- `context/AppContext.tsx` — wraps React Query `useQuery`/`useMutation` calls; exposes same API as before so all screens are unchanged
- `app/login.tsx` — login/signup screen; shown automatically when no session exists
- `supabase_schema.sql` — run once in the Supabase SQL Editor to create tables + RLS policies
- `.env.local` — `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (never commit this file)

**Cache strategy:** React Query `staleTime=5min`, `gcTime=24h`, persisted to AsyncStorage under key `proagenda-cache`. On app open, data renders from cache instantly; background refetch updates it silently.

**RLS:** Every table has `user_id` + a policy `auth.uid() = user_id`. Each user only ever sees their own data.

**Key types in `MockData.ts`:**
- `Patient` — includes `sessions: Session[]`, `paymentStatus`, `nextSession`, `notes`
- `Session` — `{ id, date, status, amount, paid, paymentMethod?, appointmentId?, paidAt? }`
- `Appointment` — mirrors a session but for the calendar view; linked via `sessionId`
- `PaymentStatus`: `'al_dia' | 'pendiente' | 'adeuda'`
- `SessionStatus`: `'realizada' | 'cancelada' | 'pendiente'`

**Bidirectional sync:** Every appointment has a `sessionId` pointing to a `Session` inside the patient record, and every session can have an `appointmentId` pointing back. When paying or cancelling, always update both. `AppContext` handles this automatically.

When adding features, extend `PATIENTS` and `APPOINTMENTS` in MockData — do not introduce new data stores or state management libraries.

### State management (`context/AppContext.tsx`)

Single global store via React Context. All derived state (paymentStatus, nextSession) is **recomputed** from sessions on every mutation — never stored manually.

**Critical functions:**
- `markSessionsPaid(patientId, sessionIds[], method)` — atomic batch payment; use this instead of calling `markSessionPaid` in a loop. Marks N sessions paid in a single `setPatients` call.
- `markSessionPaid(patientId, sessionId, method)` — wrapper around `markSessionsPaid` for single sessions.
- `markAppointmentPaid(id, method)` — use from the Agenda view; syncs the linked session automatically.

**`computePaymentStatus(sessions)` rule (canonical — must be consistent everywhere):**
```
relevant = sessions where status !== 'cancelada' && !paid
if relevant is empty → 'al_dia'
if any relevant.date < today → 'adeuda'
else → 'pendiente'
```

### Financial calculation rules (must be consistent across all views)

These rules are the single source of truth. All screens derive metrics from `patients[].sessions`, never from `appointments[]`.

| Metric | Rule |
|---|---|
| **Debtors** | `patients` with at least one session where `date < today && !paid && status !== 'cancelada'` |
| **Turnos sin cobrar** (card) | `debtors.reduce((sum, d) => sum + d.sessions, 0)` — derived from the debtors list so card and list always match |
| **Per-debtor session count** | sessions where `date <= today && !paid && status !== 'cancelada'` (includes today) |
| **Total pendiente** | sum of `totalOwed` per debtor; display with `formatCurrency()`, never abbreviated (`k`) |
| **Total cobrado** | all paid sessions ever: `patients.flatMap(p => p.sessions).filter(s => s.paid)` |
| **Cobros recientes** | built from `patient.sessions` (not `appointments`); sorted by `paidAt ?? date + 'T00:00:00'` descending |

`paidAt` on a session is set to `getNowISO()` (local datetime) when payment is registered — this enables sorting cobros by when payment happened, not when the session occurred.

### Modal pattern

All modals accept `patientId: string | null` (not a `Patient` object). They read live patient data directly from `useApp()` inside the modal. This prevents stale-reference bugs where the modal would show outdated session lists.

```typescript
// Correct
<PaymentModal visible={!!paymentPatientId} patientId={paymentPatientId} onClose={...} />

// Wrong — stale snapshot
<PaymentModal patient={somePatientObject} ... />
```

### Date utilities (`constants/dateUtils.ts`)

Always use these — never `new Date('YYYY-MM-DD')` which parses as UTC and shifts the day in Argentina (UTC-3).

- `getTodayISO()` — returns `'YYYY-MM-DD'` in local time
- `parseLocalDate(str)` — parses `'YYYY-MM-DD'` as local midnight
- `buildDateISO(year, month, day)` — builds `'YYYY-MM-DD'` from parts
- `formatTodayCompact()` — returns e.g. `"Vie, 22 de mayo"`

### Theming

`constants/Colors.ts` exports `Colors` with `light` and `dark` keys. Always consume via:

```typescript
const colorScheme = useColorScheme() ?? 'light';
const c = Colors[colorScheme];
```

Available tokens: `text`, `background`, `card`, `border`, `accent`, `accentLight`, `success`, `successLight`, `warning`, `warningLight`, `danger`, `dangerLight`, `muted`, `mutedLight`.

### Icons

`components/ui/IconSymbol.tsx` maps SF Symbol names → MaterialIcons. When adding a new tab or icon, add the mapping to the `MAPPING` object or the icon will render as `undefined` and crash.

### Design system

All screens: `SafeAreaView` → `ScrollView` with `StyleSheet.create`. No UI library. Indigo accent (`#6366F1`), white cards, soft shadows, rounded corners (12–20px radius), neutral slate backgrounds.
