<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="100" alt="NestJS Logo" />
</p>

<h1 align="center">Touchee — Backend</h1>

<p align="center">
  A safe space to connect — mood-based matching, supportive communities, and real conversations.
</p>

## About Touchee

Touchee is a social platform built around emotional connection rather than broadcast content.
Instead of an open feed for anyone to post anything, Touchee is designed around two core ideas:

- **Mood-matching** — connect with a stranger who's feeling something similar right now, for a real-time conversation
- **Curated communities** — Reddit-style communities, but scoped to a fixed set of safe, supportive categories (e.g. Anxiety, Grief, Relationships) rather than open-ended topics

This repository is the backend API powering the platform — built with **NestJS**, **PostgreSQL** (via **Prisma**), and designed to grow into **Redis** (for live matching state) and **Kafka** (for event-driven features) as the platform scales.

## Tech Stack

| Layer              | Technology                                                 |
| ------------------ | ---------------------------------------------------------- |
| Framework          | [NestJS](https://nestjs.com) (monorepo)                    |
| Database           | PostgreSQL                                                 |
| ORM                | [Prisma](https://prisma.io)                                |
| Auth               | JWT (Passport)                                             |
| Local dev database | Docker Compose                                             |
| Planned            | Redis (live matching), Kafka (events), GraphQL, Kubernetes |

## Features

**Built:**

- ✅ Auth — register/login (Account + User split, JWT-based sessions)
- ✅ User profiles
- ✅ Communities & posts — curated categories, upvote/downvote (Reddit-style)

**Designed, in progress:**

- 🚧 Mood-matching — pair users by current mood via a Redis-backed pool
- 🚧 Match cooldowns/exclusions — never re-matching blocked or recently-matched users
- 🚧 Friends — add a friend after a good match
- 🚧 Real-time chat — group + 1:1, reactions, read receipts
- 🚧 Trust & safety — reporting, and call-evidence capture (transcript/audio) only when a report is filed

**Planned (later phases):**

- 📋 Gamification — levels, achievements, level-gated permissions
- 📋 Microservices split — `api` / `gateway` / `worker` apps
- 📋 GraphQL layer
- 📋 Kubernetes deployment
- 📋 Payments, Coupons, MiniGames, Expert/counselor accounts _(not yet designed — deliberately deferred until the core loop is validated)_

## Project Structure

This is a NestJS **monorepo** — one codebase, multiple apps, shared libraries:
