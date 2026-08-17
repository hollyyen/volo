# Volo — Online Compiler

Full-stack multi-language online compiler (like Programiz), built from scratch —
**no Judge0, no third-party execution API**. You own the whole pipeline.

Supports: C, C++, Python 3, JavaScript (Node.js), Java.

```
volo/
├── backend/          # Node/Express execution engine (deploy to Render/Railway/Fly.io)
│   ├── server.js
│   ├── languages.js
│   ├── package.json
│   ├── Dockerfile
│   └── .gitignore
└── frontend/         # Static site (deploy to Vercel)
    ├── index.html
    ├── style.css
    ├── script.js
    └── config.js
```

## Why the backend can't live on Vercel

Vercel's serverless functions run in a locked-down environment with **no gcc/g++/javac
installed**, and no ability to spawn arbitrary system processes long-term. Since Volo
compiles and runs real C/C++/Java/Python code, the backend needs a host that lets you
run a proper container with those toolchains installed — e.g. **Render**, **Railway**,
or **Fly.io**. The included `Dockerfile` handles that. The **frontend** (static HTML/CSS/JS)
deploys fine on Vercel.

---

## Part 1 — Run it locally in VS Code

### 1. Prerequisites
Install on your machine:
- [Node.js 18+](https://nodejs.org)
- A C/C++ compiler: `g++`/`gcc` (on Mac: `xcode-select --install`; on Ubuntu:
  `sudo apt install build-essential`; on Windows: install
  [MinGW](https://www.mingw-w64.org/) or use WSL)
- Python 3 (`python3 --version`)
- Java JDK (`javac -version`) — e.g. [Adoptium Temurin](https://adoptium.net/)

### 2. Open the project
Unzip the project and open the `volo` folder in VS Code
(`File > Open Folder...`).

### 3. Start the backend
```bash
cd backend
npm install
npm start
```
You should see: `Volo backend listening on port 5000`

Test it:
```bash
curl -X POST http://localhost:5000/run \
  -H "Content-Type: application/json" \
  -d '{"language":"python","code":"print(1+1)","input":""}'
```

### 4. Start the frontend
The frontend is plain HTML/CSS/JS — no build step needed.
Easiest way: install the **"Live Server"** extension in VS Code, right-click
`frontend/index.html` → **Open with Live Server**.

Make sure `frontend/config.js` points to your local backend:
```js
const VOLO_API_URL = "http://localhost:5000";
```

Open the page, pick a language, hit **Run ▶**. You should see output.

---

## Part 2 — Deploy the backend (Render, free tier works)

1. Push the `volo` folder to a **GitHub repo**.
2. Go to [render.com](https://render.com) → **New +** → **Web Service**.
3. Connect your GitHub repo.
4. Set:
   - **Root Directory**: `backend`
   - **Environment**: `Docker` (so it uses the included `Dockerfile`, which installs
     gcc/g++/python3/JDK)
   - **Instance type**: Free is fine to start
5. Deploy. Once live, copy the URL Render gives you, e.g.
   `https://volo-backend.onrender.com`
6. Test it the same way as step 3 above, but with the live URL.

(Railway and Fly.io work the same way — point them at the `backend` folder and let
them build from the `Dockerfile`.)

---

## Part 3 — Deploy the frontend to Vercel

1. In `frontend/config.js`, update:
   ```js
   const VOLO_API_URL = "https://volo-backend.onrender.com"; // your live backend URL
   ```
   Commit and push this change.
2. Go to [vercel.com](https://vercel.com) → **Add New... > Project**.
3. Import the same GitHub repo.
4. Set **Root Directory** to `frontend`.
5. Framework preset: **Other** (it's static — no build command needed).
6. Deploy. Vercel gives you a live URL like `https://volo.vercel.app`.

---

## Part 4 — Lock down CORS (recommended before sharing publicly)

In `backend/server.js`, replace:
```js
app.use(cors());
```
with:
```js
app.use(cors({ origin: "https://volo.vercel.app" }));
```
Redeploy the backend so only your frontend domain can call the API.

---

## How execution works (no Judge0)

For each `/run` request, `server.js`:
1. Creates a fresh temp directory (`fs.mkdtempSync`) — one per request, deleted after.
2. Writes the user's code to a file named `volo1.<ext>` (or `Volo1.java` for Java,
   since Java requires the public class name to match the filename).
3. Compiles it if needed (`g++`, `gcc`, `javac`) with a compile timeout.
4. Runs the compiled binary or interpreter (`python3`, `node`, `java`) with a
   separate run timeout, piping in any stdin you provide.
5. Captures stdout/stderr, sends them back, deletes the temp directory.

### Notes on safety / hardening
This is a solid working baseline, not a production-grade sandbox. Timeouts and
output-size limits are in place, but a temp-dir + `exec()` approach still shares the
host OS. Before opening it to the public internet, consider adding:
- Per-request CPU/memory limits (e.g. run each job inside its own short-lived Docker
  container via `dockerode`, or use `cgroups`/`ulimit`)
- Rate limiting (e.g. `express-rate-limit`) per IP
- Disallowing network access from executed code
- Running the executor as a low-privilege, non-root user

## Adding another language
Add an entry to `backend/languages.js` (compile + run commands) and to the
`LANGUAGES` object in `frontend/script.js` (label + boilerplate). Make sure the
runtime/compiler is installed in `backend/Dockerfile`.
