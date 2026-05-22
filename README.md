# ProAgenda

Mobile and web app for independent professionals (psychologists, nutritionists, coaches) to manage patients, appointments, and finances.

Built with **React Native + Expo** (SDK 54). No backend — all state is local.

## Stack

- [Expo](https://expo.dev) SDK 54 + Expo Router v6 (file-based routing)
- React Native + TypeScript
- React Context for global state

## Features

- **Dashboard** — income summary, weekly calendar, quick actions
- **Patients** — full profiles with sessions, payment history, and clinical notes
- **Agenda** — appointment management with pay/cancel actions
- **Finances** — income charts, outstanding debts, recent payment feed

## Getting started

```bash
npm install
npm run web       # browser (Chrome at localhost:8081)
npm run android   # Android via Expo Go
npm run ios       # iOS via Expo Go
```

> **Windows:** run `npm run web` from `cmd`, not PowerShell.

## Project structure

```
app/(tabs)/         # Four main tabs: Dashboard, Patients, Agenda, Finances
app/paciente/[id]   # Patient profile (dynamic route)
components/modals/  # PaymentModal, AppointmentModal, PatientModal, ApptDetailModal
context/            # AppContext — single global state store
constants/          # MockData, Colors, dateUtils
```

## License

MIT
