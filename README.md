# Smash!ng Cats

Server-authoritative multiplayer arcade runner built around a deterministic simulation core, client prediction, interpolation, and reusable multi-client architecture.

---

## Tech Overview

### Architecture

```txt
client input ─────▶ server authoritative core
client ◀──── snapshots/deltas ───── server
```

The server is the source of truth.

Clients:

- send player input
- predict local movement
- interpolate remote entities
- render the world

---

## Monorepo Structure

```txt
packages/
├── core               Deterministic game simulation
├── protocol           Shared protocol and snapshot types
├── client-netcode     Prediction/interpolation helpers
├── i18n               Shared localization

apps/
├── cli-client         CLI client
├── server             WebSocket authoritative server
└── web-client         Vite web client
```

---

## Features

### Networking

- deterministic fixed-tick simulation
- server-authoritative multiplayer
- delta snapshot replication
- full snapshot recovery
- client-side prediction
- interpolation
- lag compensation
- reconnect-safe architecture

### Gameplay

- endless arcade runner
- jump + smash mechanics
- enemies, civilians, obstacles
- HP and score system
- pause support
- touch controls

### Rendering

- Canvas renderer
- Phaser renderer
- Three.js renderer
- parallax environments
- particles
- screen shake
- HUD overlays
- mobile orientation overlay

### Platform Support

- Web
- Android (Capacitor)

### Localization

- English
- Ukrainian

---

## Tech Stack

### Core

- TypeScript
- Node.js
- pnpm workspaces

### Networking

- WebSockets
- deterministic simulation
- snapshot replication

### Client

- Vite
- Canvas 2D
- Phaser
- Three.js

### Mobile

- Capacitor
- Android Studio

---

## Development

Install dependencies:

```bash
pnpm install
```

Start development:

```bash
pnpm dev
```

Web client:

```txt
http://localhost:5173
```

---

## Build

### Full Build

```bash
pnpm build
```

### Web Client

```bash
pnpm build:web
```

### Server

```bash
pnpm build:server
```

### Android

Build web assets and sync Capacitor:

```bash
pnpm build:android
```

Open Android Studio:

```bash
pnpm android:open
```

Run on device/emulator:

```bash
pnpm android:run
```

---

## Android Notes

Capacitor project files are stored in:

```txt
apps/clients/web-client/android
```

After changing frontend assets:

```bash
pnpm build:android
```

This rebuilds the web client and syncs assets into the Android project.

---

## Scripts

### Root

```bash
pnpm dev
pnpm build
pnpm build:web
pnpm build:server
pnpm build:android
pnpm android:sync
pnpm android:open
pnpm android:run
```

---

## License

MIT
