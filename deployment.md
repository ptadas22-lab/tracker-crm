# Frontend + Backend GitHub Split Deployment

## 1) Backend Repository
Deploy this Node server anywhere (Render/Railway/Fly/etc) and set:

- `PORT` (provided by host)
- `GEMINI_API_KEY` (optional)
- `CORS_ORIGINS` = comma-separated frontend URLs, example:
  - `https://yourname.github.io,https://your-custom-domain.com`

API endpoints:
- `POST /generate`
- `POST /plan`
- `GET /test-ai`

## 2) Frontend Repository (GitHub Pages)
Copy `public/index.html`, `public/app.js`, `public/styles.css` into frontend repo.

In the app UI, set **Backend API Base URL** to your backend URL, example:
- `https://your-backend.onrender.com`

If the field is blank, frontend calls same-origin backend (good for local full-stack run).

## 3) Local Run
```bash
npm install
npm start
