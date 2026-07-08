# AGENTS.md

Repo: `zipup` — a self-hostable "personal cloud" / PaaS. Backend serves the admin UI, deploys user apps (STATIC artifacts or DYNAMIC Docker containers), manages SSL via OpenResty + ACME, exposes a WireGuard VPN for reaching Postgres/Valkey/VictoriaLogs.

## Layout (pnpm workspace)

- `backend/` — Hono + Node 24 API, sqlite (libsql) via drizzle-orm, esbuild build, listens on `:8080`. Also serves `frontend/dist` at `/`.
- `frontend/` — React 18 + Mantine 8 + Vite SPA. Builds to `frontend/dist`, consumed by backend.
- `cli/` — `zipup-cli` npm package (Commander). Signs/uploads artifacts to the backend.
- `common/` — `@zipup/common` workspace package: shared zod schemas + HMAC `signPayload` / `createBodyHash` used by both backend and CLI. Do not import cross-package paths — always import via `@zipup/common`.
- `openresty/` — OpenResty image with Lua routing, ACME autossl, calls backend's internal routes API.
- `wireguard/`, `redis/`, `certs/`, `vector.yaml` — supporting config baked into the Docker image / compose.
- `release/` — **generated** by `release.sh`; do not edit by hand. Contains a different `docker-compose.base.yaml` (adds `wireguard_network`) used by end-user installs.
- `release.sh`, `install.sh`, `certs.sh` — release packaging / end-user installer. `install.sh` hardcodes `REPO_OWNER="ankitaabad"` and pulls the latest release tarball from GitHub.

## Commands

All run from repo root unless noted.

| Task | Command |
|---|---|
| Dev server (backend only, hot reload) | `pnpm -F backend dev` (alias: `pnpm server`) |
| Dev UI (Vite) | `pnpm -F frontend dev` (alias: `pnpm ui` or `pnpm frontend`) |
| Full local stack (containers, dev override) | `pnpm dockerup` |
| Typecheck frontend | `pnpm -F frontend typecheck` |
| Build everything | `pnpm build` (= `pnpm -F frontend build && pnpm -F backend build`) |
| Reset sqlite + migrate + seed admin | `pnpm -F backend dbInit` (alias: `pnpm dbInit`) |
| Apply schema only | `pnpm -F backend migrate` (`drizzle-kit push`) |
| Build CLI bundle to `cli/dist/` | `pnpm -F cli build` |
| Prepare a release artifact in `release/` | `./release.sh` (run after a clean build) |
| Build the all-in-one Docker image | `pnpm dockerBuild` |

No root-level lint / format / test scripts. No CI workflows beyond `.github/workflows/release.yaml` (manual dispatch: builds image, tars `release/`, attaches to GitHub release).

## Path aliases (from `tsconfig.base.json`)

- `@common/*` → `common/src/*`
- `@backend/*` → `backend/src/*`
- `@frontend/*` → `frontend/src/*`
- `@zipup/common` (workspace package; also accepts `@common/index` style in some files — both resolve to `common/src`)

Frontend `tsconfig.json` only knows `@zipup/common/*` (not the local `@common/*`), so prefer the `@zipup/common` import in code that is type-checked by Vite. Backend uses `@backend/*` and `@common/index` interchangeably.

## Architecture notes

- **Backend entry**: `backend/src/index.ts`. Middleware order matters: `secureHeaders` → `/assets/*` static (long cache) → `/api/__zipup_internal__/*` internal (no auth, header-gated) → `/api/artifacts/*` and `/api/deployment/*` (HMAC app-key auth) → `/api/*` (cookie auth) → catch-all serves `frontend/dist/index.html` (SPA).
- **Internal API for OpenResty** (`backend/src/routes/internal.ts`): `/api/__zipup_internal__/routes` and `/api/__zipup_internal__/domain-whitelist`. OpenResty pulls these on init + on `POST /__proxy__/reload` (port 9090, internal-only) and stores them in `lua_shared_dict` (`routes` 1m, `whitelist_domains` 1m, `acme` 16m). All requests from openresty must carry `Zipup-Internal-Source: openresty`.
- **App auth (CLI → backend)**: signed requests with headers `Zipup-App-Key`, `Zipup-Signature` (HMAC-SHA256 over `METHOD\nPATH\nEXPIRES\nBODY_HASH`), `Zipup-Body-Hash` (sha256 hex of body), `Zipup-Expires` (unix seconds, +5min). Helpers live in `common/src/index.ts` (`signPayload`, `createBodyHash`).
- **App types**: `STATIC` — artifact unpacked to `static_artifacts` volume, served by OpenResty at the route's `path_prefix`. `DYNAMIC` — backend spawns a Docker container (`zipup_<appId>_<deploymentIdSuffix>`) on the docker socket, exposed on internal port 3000, proxied by OpenResty to `http://<container_name>:3000`.
- **Datastore**: SQLite file. Local: `backend/src/db/zipup.db` (created by `dbInit`). Release: `/db/zipup.db` (set `DB_PATH=/db`). Drizzle schema is `backend/src/db/schema.ts`; migrations live in `backend/drizzle/migrations/`.
- **Secrets at runtime**: `/secrets/tokens.json` (PASETO keys), `/secrets/encryptionKey.json` (auto-generated on first boot). Volumes: `static_artifacts`, `dynamic_artifacts`, `secrets`, plus per-service volumes.
- **Network**: two Docker bridges — `edge_network` (openresty + zipup) and `core_network` 172.25.0.0/24 (zipup, postgres=172.25.0.2, valkey=172.25.0.3, victorialogs=172.25.0.4, wireguard=172.25.0.5). WireGuard VPN clients get 10.13.13.0/24 and DNAT to the core IPs on ports 5432/6379/9428.
- **ACME**: OpenResty uses `lua-resty-acme` with a per-domain whitelist populated from the DB. `ACME_EMAIL` is mandatory in `.env`. `nginx.conf` has a debug-toggleable `staging = true` for Let's Encrypt testing.
- **Logging**: `vector` tails `/var/lib/docker/containers/*/*-json.log`, parses the Docker `appName`/`appType` labels, forwards to `victorialogs` (`172.25.0.4:9428`). In dev, VictoriaLogs UI on `http://localhost:9428` (compose.dev.yaml). Backend uses `senselogs` with per-request `requestId` via `AsyncLocalStorage`.

## Things to know before touching code

- **Tests are currently broken.** `__test__/app.test.ts` and `__test__/deploy.test.ts` import from `../server/src/...` (stale path — actual dir is `backend/`). Vitest is configured in `backend/vitest.config.ts` with `include: ["__test__/**/*.test.ts"]` but that path is relative to `backend/`, not the repo root, so vitest finds nothing. `backend/package.json` `test` script just exits with an error. Don't run `pnpm test` and expect results; treat the suite as TODO.
- **`frontend/tsconfig.json` has an invalid key**: `"jsonImports": "true"` should be `"resolveJsonModule": true`. Vite works fine; `tsc --noEmit` may or may not surface this depending on version.
- **`common/src/index.ts` self-imports** from `@zipup/common` on line 1 — it's a leftover. The rest of the file is the real source. If a circular-resolution issue appears, that line is the cause.
- **Two `docker-compose.base.yaml` exist**: root one (used by `dockerup` for dev) and `release/docker-compose.base.yaml` (used by end users; has a third `wireguard_network` and `postgres`/`valkey`/`victorialogs`/`wireguard` pinned to `172.25.0.x` on it instead of on `core_network`). Don't merge them.
- **Root `users.acl/` is an empty directory** (not a file). The real ACL is `redis/users.acl` and is bind-mounted into the valkey container.
- **The wireguard image is external** (`ghcr.io/ankitaabad/zipup-wireguard:latest`) and the install script pulls the CLI/image from `ankitaabad/zipup`. Forking means re-pointing `install.sh` (`REPO_OWNER`, `REPO_NAME`), `docker-compose.base.yaml` (`wireguard` image), and `docker-compose.release.yaml` (`zipup` image).
- **Dev compose dev flow**: `docker-compose.dev.yaml` overrides `zipup` to mount the repo at `/app`, run `pnpm install && pnpm --filter backend run dev`, and bind host `:3000` → container `:8080`. The `openresty` container also gets `ENV=development` so `lua/internal_utils.lua` `is_dev()` short-circuits HTTPS enforcement. Host port for openresty is `:8080`, postgres `:5432`, valkey `:6379`, victorialogs `:9428`, vector `:8686`.
- **Adding a CLI flag**: edit `cli/src/commands/deploy.ts`, then `loadConfig` in `cli/src/config.ts` (zod schema + merge logic). `host`/`appKey`/`secretKey` follow CLI > env > file precedence; `ignore` and `tags` are unioned.
- **Adding a backend route**: pick the right router under `backend/src/routes/`, mount it in `backend/src/index.ts`. Internal-only routes belong under `internalRouter` with the `internalRoutesAuthMiddleware` already in place; "public to openresty" is just the `/api/__zipup_internal__/*` prefix. App-scoped deploy routes go under the HMAC-gated mount points.
- **Schema change flow**: edit `backend/src/db/schema.ts`, then `pnpm -F backend migrate` (pushes to local sqlite). For a fresh DB run `pnpm -F backend dbInit` (also seeds the `zipup` admin user with password `zipup`).
- **No pre-commit / lint / format configured.** Match existing style: 2-space indent, no trailing semicolons inconsistency tolerated in TS, single quotes in frontend, double quotes in backend.

## Operational gotchas

- First boot needs `ACME_EMAIL` in `.env` or openresty fails with `error("ACME_EMAIL is not set")` in `init_by_lua_block`. The `install.sh` prompts for it; locally you must write `.env` yourself.
- `install.sh` requires ports 80, 443, 51820 free; it exits early if any are in use.
- The wireguard container needs `NET_ADMIN` + `SYS_MODULE` caps and `/lib/modules` mounted read-only — these are set in `docker-compose.base.yaml`. The container restarts itself via the `update_wireguard_config` event handler in `backend/src/events/event.ts` (calls `restartDockerContainer("wireguard")`).
- `release.sh` includes a comment saying frontend + backend builds are commented out (the Docker image is built with the multi-stage `Dockerfile` separately). Don't "fix" this — `release.sh` only packages the runtime artifact (compose files, nginx/lua, wg0 template, seeded sqlite).
- The `sync` root script (`chokidar` + `scripts/sshsync.sh`) is a dev convenience that rsyncs the working tree to a remote — `sshsync.sh` is a no-op stub. Configure your remote in your shell; don't expect this to do anything out of the box.

## Useful one-liners

- Postgres from outside (via VPN): `psql -h 172.25.0.2 -U zipup -d zipup` (see `notes.md`).
- Tail backend logs: `docker logs -f zipup`.
- Force-reload openresty route table: `curl -X POST http://localhost:8080/__proxy__/reload` (only reachable from inside `edge_network`).
- Generate a wireguard keypair in base64 (for client config): `tsx test.ts` (top-level script in the repo).
