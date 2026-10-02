# RuralSaathi

RuralSaathi is a full-stack rural development and finance planning application for village-level decision making. It brings together household financial data, crop risk analysis, shared resource tracking, and project feasibility assessment into a single desktop/web workspace.

## What the app does

- Tracks household records, income, expenses, loans, and crop details
- Summarizes village financial health through a dashboard with KPIs and cash-flow views
- Monitors local resources and skill availability across the village
- Reviews and ranks project opportunities based on budget, skills, equipment, and expected benefit
- Runs a what-if consultancy simulator to test how additional funding or capacity changes project feasibility
- Supports English by default, with Hindi and Marathi translations for key navigation items, page headings, statuses, and form labels
- Stores state in SQLite and exposes the business logic through an Express API
- Ships as a desktop app via Electron for local deployment

## Tech stack

- Frontend: React 19 + Vite
- API: Express 5
- Database: SQLite via better-sqlite3
- Auth: JWT-based protected API routes
- Desktop shell: Electron
- Monorepo/workspaces: npm workspaces for client and server

## Repository structure

```text
.
├── client/                 # React + Vite frontend
│   ├── src/                # application pages, hooks, components, API client
│   └── package.json
├── server/                 # Express API and SQLite data layer
│   ├── src/                # routes, db, engines, validation, seed logic
│   └── package.json
├── electron/               # Electron main process and preload bridge
├── legacy/                 # older static prototype or reference files
├── build/                  # build artifacts / packaging output
├── package.json            # root workspace scripts
├── electron-builder.yml    # Electron packaging config
├── README.md
└── ...
```

## Getting started

Install dependencies from the repo root:

```bash
npm install
```

Start the client and server together in development mode:

```bash
npm run dev
```

This runs:

- the Vite frontend
- the Express API in watch mode
- the SQLite-backed backend used by the dashboard and consultancy tools

The API is configured to run on localhost port 4000 by default, while the Vite client uses its default local dev port.

## Seed demo data

If the database is empty, load the included sample records before using the app:

```bash
npm run seed
```

This initializes the SQLite database with household, village, crop, project, and advisory data used by the demo workflows.

## Desktop app

For local development, build the frontend and launch the Electron app:

```bash
npm run electron:dev
```

This command builds the client bundle, rebuilds the native SQLite dependency for Electron, and starts the desktop shell from the project folder.

## Production builds

Create a production client build:

```bash
npm run build:client
```

Package the app for desktop distribution:

```bash
npm run dist
```

Build a Windows package:

```bash
npm run dist:win
```

This creates a Windows installer (`dist-electron/RuralSaathi-Setup-<version>.exe`) and a portable executable in `dist-electron`. Run the installer once to install RuralSaathi and create a desktop shortcut; afterward, double-click the shortcut to launch it without opening a terminal. The portable build can also be launched directly without installation.

The app stores its SQLite database and configuration under `%APPDATA%\RuralSaathi`, so they remain available between launches and are preserved when the app is uninstalled.

## API overview

The backend exposes protected endpoints under `/api` and public auth endpoints under `/api/auth`.

Key features include:

- household management and record retrieval
- village analytics and KPIs
- resource and skill inventory endpoints
- consultancy/project recommendation logic
- advisory logging
- admin metadata and setup helpers

The app expects a JWT secret for protected routes in normal runtime usage. In development mode, the server will fall back to a local default secret if one is not supplied.

## Notes

- The app uses a local SQLite database; database files are expected in the server data directory.
- The project is designed as a local and offline-friendly rural planning tool rather than a cloud-hosted SaaS application.
- The legacy folder contains older prototype assets and is not the active app flow.
