# LinkUp

A real-time web chat application built for the AI Herders Hackathon 2026.

## Features

- **Accounts** — register with email + username, login with either, persistent sessions across browser restarts
- **Rooms** — public (searchable catalog) and private (invite-only) chat rooms with owner/admin roles
- **Direct Messages** — one-to-one messaging between friends
- **Friends** — send/accept/decline friend requests with optional message, remove friends, user bans
- **Messaging** — real-time delivery, message replies/quotes, edit, delete, emoji picker, infinite scroll history
- **File sharing** — upload images and files (paste or click), inline image previews, optional per-file comment, access-controlled downloads
- **Presence** — online / AFK / offline indicators with 60-second AFK timeout, multi-tab aware
- **Moderation** — ban/unban members, manage admins, lock conversations, delete rooms
- **Notifications** — unread badges on rooms and contacts, browser tab title unread count, toast alerts for friend requests and invitations
- **Sessions** — view and revoke active sessions per device, change password, delete account
- **Mobile-friendly** — responsive layout with slide-out sidebar drawer on small screens

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Zustand, Socket.io-client, Tailwind CSS |
| Backend | Node.js (ESM), Fastify, Socket.io, Prisma ORM |
| Database | PostgreSQL |
| File storage | Local filesystem (mounted volume) |
| Deployment | Docker (single container), Render.com |

## Running locally

**Prerequisites:** Docker with Compose (Rancher Desktop in dockerd mode works)

```bash
git clone https://github.com/OSaliy/LinkUp.git
cd LinkUp
docker compose up
```

- App: http://localhost:8080
- API: http://localhost:3000/api

The database schema is applied automatically on startup via `prisma db push`.

## Project structure

```
LinkUp/
├── client/          # React frontend (Vite)
│   └── src/
│       ├── pages/       # Login, Register, ForgotPassword, Chat
│       ├── components/  # Sidebar, ChatWindow, MessageInput, MemberList, ...
│       ├── store/       # Zustand stores (auth, chat)
│       └── socket.js    # Socket.io client
├── server/          # Fastify backend
│   └── src/
│       ├── routes/      # auth, rooms, messages, contacts, files, users
│       ├── plugins/     # db (Prisma), auth middleware, socket setup
│       └── services/    # presence tracking
│   └── prisma/
│       └── schema.prisma
├── docker-compose.yml   # Local dev (client + server + postgres)
├── Dockerfile           # Production single-container build
└── render.yaml          # Render.com deployment blueprint
```

## Environment variables (server)

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `JWT_SECRET` | — | Secret for session signing |
| `PORT` | `3000` | HTTP port |
| `UPLOADS_DIR` | `./uploads` | File storage path |
| `CLIENT_URL` | `http://localhost` | CORS origin (dev only) |
| `NODE_ENV` | `development` | Set to `production` to serve built client |

## Deployment

The app is deployed on [Render.com](https://render.com) using the `render.yaml` blueprint:
- Single web service running the Fastify server which also serves the built React client
- Managed PostgreSQL database
- Persistent disk volume for uploaded files

Live URL: **https://linkup-1-y97x.onrender.com**
