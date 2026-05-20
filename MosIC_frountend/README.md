# MosIC_frountend

`MosIC_frountend` is a clean React + TypeScript + Tailwind admin starter prepared for SQL-backed projects.

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- ApexCharts (`react-apexcharts`)
- React Router

## Getting Started

```bash
npm install
npm run dev
```

## API Base URL (Login Endpoint)

Your Spring Boot login endpoint is:

- `POST http://localhost:8080/api/auth/login`

In the frontend, the sign-in flow calls `POST /api/auth/login`. In development, Vite proxies `/api/*` to `http://localhost:8080` (see `vite.config.ts`), so it reaches the same backend endpoint without CORS headaches.

If you want the frontend to call the backend directly (no proxy), set `VITE_API_BASE_URL=http://localhost:8080` in `.env.local` and restart `npm run dev`. Your Spring Boot app must allow CORS for the frontend origin (for example `http://localhost:3000`).

## Build and Lint

```bash
npm run build
npm run lint
```

## Available Routes

- `/` Dashboard home
- `/profile` Profile placeholder
- `/line-chart` Line chart page
- `/bar-chart` Bar chart page
- `/signin` Sign in page
- `/signup` Sign up page
- `*` Not found page

