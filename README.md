# Smash!ng Cats

Server-authoritative multiplayer arcade runner with a deterministic core, client prediction, interpolation, lag compensation, and multi-client rendering architecture.

## Vision

Smash!ng Cats is a fast arcade runner where cats sprint through chaotic levels, dodge obstacles, smash enemies, and survive as long as possible.

The project focuses on:

- deterministic simulation
- server-authoritative multiplayer
- smooth networking
- reusable game core
- multiple rendering clients
- simple but scalable architecture

---

## Architecture

```txt
client input ─────▶ server authoritative core
client ◀──── snapshots/deltas ───── server
```

The server is always the source of truth.

Clients:

- send only player input
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
├── server             WebSocket authoritative server
└── clients/
    └── web-client     Canvas-based web client
```

---

## Features

### Multiplayer

- server-authoritative gameplay
- deterministic fixed-tick simulation
- delta snapshots
- full snapshot recovery
- client-side prediction
- snapshot interpolation
- lag compensation
- reconnect-safe architecture

### Gameplay

- endless arcade runner
- multiple playable cats
- jump + smash mechanics
- enemies, civilians, obstacles
- HP and score system
- pause support
- touch controls
- fullscreen mobile support

### Rendering

- parallax environments
- animated sprites
- foreground/background layers
- landing smash effects
- particles
- screen shake
- death animations
- HUD overlays
- orientation overlay for mobile

### Audio

- sound effects
- background music
- mobile audio unlock
- runtime audio toggles

### Localization

Currently supported:

- English
- Ukrainian

---

## Networking Model

```txt
input → prediction → reconciliation → interpolation
```

### Client

The client:

- captures input
- predicts local movement
- smoothly interpolates remote entities
- reconciles against authoritative snapshots

### Server

The server:

- runs deterministic simulation
- validates collisions
- resolves combat
- broadcasts snapshots
- performs lag compensation

---

## Controls

### Keyboard

| Action     | Keys                |
| ---------- | ------------------- |
| Move Left  | A / ArrowLeft       |
| Move Right | D / ArrowRight      |
| Jump       | Space / W / ArrowUp |
| Smash      | Jump while airborne |

### Mobile

- drag left/right to move
- swipe up to jump
- swipe down mid-air to smash

---

## Run Locally

Install dependencies:

```bash
pnpm install
```

Start development mode:

```bash
pnpm dev
```

Open:

```txt
http://localhost:5173
```

---

## Production Build

### Web Client

```bash
pnpm build:web
```

### Server

```bash
pnpm build:server
```

### Android Build

```bash
pnpm build:android
```

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
- Canvas 2D rendering
- mobile touch controls

---

## Current Status

Implemented:

- deterministic multiplayer core
- prediction/interpolation
- delta snapshot sync
- multiple enemy types
- civilians and obstacles
- parallax rendering
- mobile controls
- audio system
- localization
- Android packaging

Planned:

- matchmaking/lobbies
- more enemy behaviors
- powerups
- cosmetics
- replay system
- additional rendering clients
- dedicated mobile UI polish

---

## Philosophy

This project intentionally keeps gameplay simple.

The main goal is building a clean, scalable multiplayer architecture that can support:

- multiple clients
- deterministic gameplay
- responsive controls
- smooth networking
- future gameplay experiments

---

## License

MIT
