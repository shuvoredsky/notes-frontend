# Secure Note-Taking Frontend

A functional frontend web client for the Secure Note-Taking REST API. This application provides authenticated note management, administrative user controls, interest-based user groupings, and public user posts.

The project was created completely from scratch without using `create-next-app`, starter kits, or UI component libraries (no shadcn/ui, no MUI, etc.).

## Tech Stack

- Next.js 16 (App Router)
- TypeScript (Strict Mode enabled)
- React 19
- Tailwind CSS v4 with PostCSS
- Zod (Client-side schema validation)
- React Context (Authentication & session state)
- Native fetch API (Lightweight, typed API client wrapper)

## Setup and Installation

### Prerequisites

- Node.js (v18.18+ or v20+)
- npm
- Running backend instance of the Secure Note-Taking API (default: `http://localhost:5000/api`)

### Installation Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/shuvoredsky/notes-frontend.git
   cd notes-frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create your local environment file from the example:
   ```bash
   cp .env.example .env.local
   ```
   On Windows PowerShell:
   ```powershell
   Copy-Item .env.example .env.local
   ```

4. Configure `.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```

5. Verify backend configuration:
   The backend must be running and its `CLIENT_URL` environment variable must include `http://localhost:3000` to allow CORS requests.

6. Start the local development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Yes | `http://localhost:5000/api` | Base URL of the REST API (including the `/api` prefix). |

## NPM Scripts

- `npm run dev`: Starts the Next.js development server on `http://localhost:3000`.
- `npm run build`: Compiles and builds the production application bundle using `next build --webpack`.
- `npm run start`: Boots the Next.js production server for built assets.

> Note on the build script: The build script uses `next build --webpack`. On Windows, Next.js 16 default Turbopack compiler panics when spawning subprocesses to evaluate the PostCSS loader (`evaluate_webpack_loader failed / node process exited`). Building with `--webpack` resolves this issue and produces optimized static and dynamic outputs cleanly.

## Project Structure

```text
notes-frontend/
├── .env.example
├── .gitignore
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tsconfig.json
└── src/
    ├── app/
    │   ├── globals.css                # Base Tailwind CSS imports
    │   ├── layout.tsx                 # Root layout with AuthProvider and Navbar
    │   ├── page.tsx                   # Index redirect (to /notes or /login)
    │   ├── login/
    │   │   └── page.tsx               # Login page with Zod validation
    │   ├── register/
    │   │   └── page.tsx               # Registration page with interests input
    │   ├── notes/
    │   │   └── page.tsx               # Note list, create, inline edit, delete, owner filter
    │   ├── admin/
    │   │   ├── users/
    │   │   │   └── page.tsx           # User management CRUD & role administration
    │   │   └── interests/
    │   │       └── page.tsx           # Aggregation Scenario 1: Users grouped by interest
    │   └── users/
    │       └── [id]/
    │           └── posts/
    │               └── page.tsx       # Aggregation Scenario 2: Public user posts lookup
    ├── components/
    │   ├── AuthGuard.tsx              # Route protection and role enforcement
    │   ├── Navbar.tsx                 # Global navigation bar with role-aware links
    │   └── Pagination.tsx             # Generic reusable pagination component
    ├── context/
    │   └── AuthContext.tsx            # Global auth state and actions
    ├── lib/
    │   └── api.ts                     # Native fetch API wrapper and error handling
    └── types/
        └── api.ts                     # Strict TypeScript interfaces matching backend models
```

## Application Routes

| Path | Access Level | Purpose |
| :--- | :--- | :--- |
| `/` | Public | Home route; redirects authenticated users to `/notes` and guests to `/login`. |
| `/login` | Guest Only | User authentication page with email and password fields. |
| `/register` | Guest Only | Account registration page with name, email, password, and optional interests. |
| `/notes` | User / Admin | Personal notes dashboard (create, inline edit, delete, pagination). Admins see owner details and can filter notes by user ID. |
| `/admin/users` | Admin Only | User administration dashboard to view, add, edit, or delete users and update roles. |
| `/admin/interests` | Admin Only | Aggregation Scenario 1 dashboard displaying users grouped by shared interests with search filter. |
| `/users/[id]/posts` | Public | Aggregation Scenario 2 view displaying posts authored by a user. If the author views their own page, allows publishing and deleting posts. |

## Authentication Architecture

Authentication uses JWT (JSON Web Tokens) stored in the browser's `localStorage`.

1. **Token Persistence and Injection**: When a user logs in or registers, the issued JWT is saved in `localStorage`. The custom API client (`src/lib/api.ts`) automatically attaches this token as a `Bearer` token in the `Authorization` header for subsequent requests.
2. **Session Verification**: On mount, `AuthContext` checks for an existing token and calls `GET /api/auth/me`. If the session is expired or invalid (HTTP 401), the token is purged and the user is reset to an unauthenticated state.
3. **Route Guards**: `AuthGuard` handles client-side protection. It supports `guestOnly` (redirecting logged-in users away from auth forms), `requireAdmin` (restricting access to admin-only pages), and standard authentication gates.
4. **Architectural Trade-Off**: Client-side `localStorage` storage was chosen for ease of standalone decoupled deployment and compatibility with client-driven requests. However, tokens in `localStorage` cannot be read during Next.js server component rendering and are vulnerable to cross-site scripting (XSS) compared to `httpOnly` secure cookies. For high-security environments, `httpOnly` same-site cookies managed via reverse proxies or server actions are recommended.

## Database Aggregations

The frontend integrates directly with the backend's two optimized MongoDB aggregation pipelines:

1. **Scenario 1: Users Grouped by Interest (`/admin/interests`)**:
   - Calls `GET /api/users/grouped-by-interests?page=&limit=&interest=`.
   - Uses a single aggregation pipeline with `$unwind`, `$group`, `$facet`, and index matching.
   - Shows interest cards with member counts and member lists, with pagination controls.
2. **Scenario 2: Public User Posts (`/users/[id]/posts`)**:
   - Calls `GET /api/users/:id/posts?page=&limit=`.
   - Uses a single `$lookup` aggregation pipeline that joins users with the `posts` collection using the compound `{ author: 1, createdAt: -1 }` index.
   - Renders the author's profile and paginated posts sorted newest first. Accessible without logging in.

Both views use standard query parameters `?page=&limit=` and consume the backend's uniform pagination envelope (`meta: { total, page, limit, pages }`).

## Deploying to Vercel

1. Push your code to GitHub.
2. Log into [Vercel](https://vercel.com) and click **Add New Project**.
3. Select your `notes-frontend` repository.
4. Select framework preset **Next.js**.
5. Set the build command to `npm run build`.
6. Add the environment variable:
   - `NEXT_PUBLIC_API_URL`: URL of the deployed backend, e.g. `https://<render-backend-url>/api`.
7. Click **Deploy**.
8. Once deployed, copy your Vercel production domain (e.g. `https://notes-frontend.vercel.app`) and add it to the backend's `CLIENT_URL` environment variable (comma-separated, e.g. `CLIENT_URL=http://localhost:3000,https://notes-frontend.vercel.app`), then redeploy the backend.

## Backend Repository

The backend REST API repository is available at:
[https://github.com/shuvoredsky/notes-backend-](https://github.com/shuvoredsky/notes-backend-)

