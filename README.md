# Smash!ng Cats

Server-authoritative multiplayer arcade runner with a deterministic core and multi-client architecture.

## Architecture

```txt
client input ─────▶ server authoritative game core
client ◀──── snapshot/state ───── server
```

## Packages

```txt
packages/core      Deterministic game logic
packages/protocol  Shared network protocol types
apps/server        WebSocket server and game loop
apps/clients/webclient Shared web client with selectable views
```

## Run

```bash
pnpm install
pnpm dev
```

Open:

```txt
http://localhost:5173
```

## Controls

- A / ArrowLeft: move left
- D / ArrowRight: move right
- Space / W / ArrowUp: jump
- Jump while airborne: smash

## Goal

This project is intentionally simple. The first milestone is to test deterministic core, server-authoritative multiplayer, snapshots, and multiple future clients.
