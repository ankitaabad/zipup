# =============================
# Stage 1: Build frontend
# =============================
FROM node:24-bookworm-slim AS frontend-builder

WORKDIR /app

# Copy workspace root files + frontend + common package.json for proper dependency resolution
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* tsconfig.base.json ./
COPY common/ ./common/
# COPY frontend/package.json ./
COPY frontend/ ./frontend/


# Install all dependencies (dev + prod) for building frontend
RUN npm install -g pnpm && pnpm install

# Copy frontend source + common source

# Build frontend
RUN pnpm build -F frontend


# =============================
# Stage 2: Build backend
# =============================
FROM node:24-bookworm-slim AS backend-builder

WORKDIR /app

# Copy workspace root files + backend + common package.json
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* tsconfig.base.json ./
COPY common/ ./common/
COPY backend/ ./backend/
# COPY backend/package.json ./backend

# Install all dependencies (dev + prod) for building backend
RUN npm install -g pnpm && pnpm install

# Copy backend source + common source

# Build backend
RUN pnpm build -F backend

# =============================
# Stage 3: Final image
# =============================
FROM node:24-bookworm-slim

WORKDIR /app

# -----------------------------
# Backend: copy build + prod deps
# -----------------------------
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/package.json ./backend/package.json
# COPY common/package.json ./common/
RUN npm pkg delete devDependencies --prefix ./backend
# Install only production deps
RUN npm install -g pnpm && pnpm install --prod --shamefully-hoist --prefix ./backend \ 
    && pnpm store prune \
    && rm -rf ~/.npm ~/.pnpm-store

# -----------------------------
# Frontend: copy build
# -----------------------------
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist



# -----------------------------
# Backend runtime
# -----------------------------
WORKDIR /app/backend
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]