# Pinnest

A Pinterest-inspired full-stack application based on the supplied tutorial reference. It includes:

- Passport local authentication with sign-up, sign-in, demo login, and sessions
- MongoDB + Mongoose persistence when `MONGODB_URI` is configured
- Seeded in-memory fallback for immediate local preview without MongoDB
- Masonry-inspired inspiration feed with search and tabs
- Image uploads with Multer and local `uploads/` storage
- Create pins with title, description, tags, and source link
- Likes, saves, default saved board, and custom boards
- Profile data and board APIs
- Responsive frontend with auth, create-pin, and create-board modals
- VS Code task and Chrome debug configuration

## Run locally

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Open `http://127.0.0.1:4173`.

### MongoDB

The app runs in memory if `MONGODB_URI` is missing or MongoDB is unavailable. For persistent users, pins, saves, and boards, run MongoDB locally or use a hosted MongoDB connection string in `.env`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/pinnest
SESSION_SECRET=use-a-long-random-secret
PORT=4173
```

### Demo account

- Email: `demo@pinnest.dev`
- Password: `demo123`

### API surface

- `GET /api/health`
- `GET /api/auth/me`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/posts?q=...`
- `POST /api/posts`
- `POST /api/posts/:id/like`
- `POST /api/posts/:id/save`
- `GET /api/boards`
- `POST /api/boards`
- `GET /api/boards/:id`
- `GET /api/profile/:username`
