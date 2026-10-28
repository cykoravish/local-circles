# Local Circles (Practice Project)

Hobby-based local meetup platform ka chhota backend. Mera maksad **PostgreSQL** seekhna tha: relations, constraints, indexes, transactions, migrations.

## Tech Stack
- Node.js + Express
- PostgreSQL (Neon, serverless)
- `pg` (raw SQL, ORM nahi)
- `bcryptjs` (password hashing), `jsonwebtoken` (auth)

## Features
- User register / login (JWT)
- Interest-based groups (city + interest filter)
- Group join, admin/member roles
- Events create karna (sirf group admin)
- Custom SQL migration runner (tracking table + transaction per file)

## Database Schema
`users`, `interests`, `groups`, `group_members`, `events`, `rsvps`

- `groups.interest_id` -> `interests.id` (`ON DELETE RESTRICT`)
- `group_members` aur `rsvps` junction tables hain (many-to-many, composite primary key)
- `CHECK` constraints roles/status/capacity ke liye
- Indexes city, interest, starts_at jaise search columns par

## Setup
```bash
git clone <your-repo-url>
cd local-circles
npm install
cp .env.example .env
```
`.env` me apni Neon `DATABASE_URL` aur `JWT_SECRET` daalo, phir:

```bash
npm run migrate
npm run dev
```

## API
| Method | Endpoint | Auth | Kaam |
|---|---|---|---|
| GET | `/health` | No | Server check |
| POST | `/register` | No | Naya user |
| POST | `/login` | No | JWT token |
| GET | `/groups?city=&interest_id=` | No | Groups list |
| POST | `/groups` | Yes | Group banao (creator admin) |
| POST | `/groups/:id/join` | Yes | Group join |
| POST | `/groups/:id/events` | Admin | Event banao |

Auth wali requests me header: `Authorization: Bearer <token>`

## Example
```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ravish@test.com","password":"12345678"}'
```

## Concepts Practiced
Transactions, foreign keys, `ON DELETE` rules, JOIN + GROUP BY, parameterized queries, Postgres error codes (`23505`, `23503`), connection pooling, versioned migrations.

## Next Steps
RSVP API, event listing (upcoming), pagination, rate limiting, tests.