# RuralSaathi

RuralSaathi is a React + Express + SQLite + Electron application for rural household financial management, crop risk analysis, village resources and consultancy.

## Architecture

React/Vite -> Express REST API -> SQLite

Electron wraps the application for Windows.

## Development

```sh
npm install
npm run dev
```

## Electron

```sh
npm run electron:dev
```

## Windows Build

```sh
npm run dist:win
```

SQLite runtime files are intentionally gitignored.
