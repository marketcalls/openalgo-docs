# 11 - Docker Configuration

## Overview

OpenAlgo provides Docker support for containerized deployment with **3-stage builds** (Python builder, Frontend builder, Production), IST timezone configuration, and proper security isolation. The Docker setup uses Python 3.12, Gunicorn with Eventlet workers, and runs as a non-root user. It includes Railway/cloud deployment support with automatic `.env` generation.

## Architecture Diagram

<figure><img src="../../.gitbook/assets/diagram-docker-build-and-runtime.png" alt="Docker three-stage build (python-builder, frontend-builder, production) and start.sh runtime with WebSocket proxy, Gunicorn and ZeroMQ bus"><figcaption></figcaption></figure>

## Dockerfile

```dockerfile
# ------------------------------ Python Builder Stage ----------------------- #
FROM python:3.12-trixie AS python-builder
RUN apt-get update && apt-get install -y --no-install-recommends     curl build-essential &&     apt-get clean && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY pyproject.toml .
# Isolated virtual-env with uv, then gunicorn and eventlet on top
RUN pip install --no-cache-dir uv &&     uv venv .venv &&     uv pip install --upgrade pip &&     uv sync &&     uv pip install "gunicorn>=25.0,<26" "eventlet==0.41.2" &&     rm -rf /root/.cache

# ------------------------------ Frontend Builder Stage --------------------- #
FROM node:22-trixie-slim AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# ------------------------------ Production Stage --------------------------- #
FROM python:3.12-slim-trixie AS production
# Timezone plus runtime deps. chromium and fonts-liberation are required by
# Kaleido 1.x (plotly static image export), which drives a real headless
# Chromium. Without them the Telegram bot's /chart silently fails in Docker.
RUN apt-get update && apt-get install -y --no-install-recommends     tzdata     curl     libopenblas0     libgomp1     libgfortran5     chromium     fonts-liberation &&     ln -fs /usr/share/zoneinfo/Asia/Kolkata /etc/localtime &&     dpkg-reconfigure -f noninteractive tzdata &&     apt-get clean && rm -rf /var/lib/apt/lists/*
# Pin appuser to UID/GID 1000. The install scripts chown the host .env to
# UID 1000 before bind-mounting it, so a different UID makes .env unwritable.
RUN groupadd --gid 1000 appuser &&     useradd --create-home --uid 1000 --gid 1000 appuser
WORKDIR /app
COPY --from=python-builder --chown=appuser:appuser /app/.venv /app/.venv
COPY --chown=appuser:appuser . .
COPY --from=frontend-builder --chown=appuser:appuser /app/frontend/dist /app/frontend/dist
# chown /app itself, not just its contents. WORKDIR creates /app as root:root
# 755 and that ownership survives COPY --chown, which would stop appuser
# creating temp files in /app (for example the atomic .env rewrite).
RUN mkdir -p /app/log /app/log/strategies /app/db /app/tmp /app/tmp/numba_cache /app/tmp/matplotlib /app/strategies /app/strategies/scripts /app/strategies/examples /app/keys &&     chown appuser:appuser /app &&     chown -R appuser:appuser /app/log /app/db /app/tmp /app/strategies /app/keys &&     chmod -R 755 /app/strategies /app/log /app/tmp &&     chmod 700 /app/keys &&     touch /app/.env && chown appuser:appuser /app/.env && chmod 666 /app/.env
COPY --chown=appuser:appuser start.sh /app/start.sh
RUN sed -i 's/\r$//' /app/start.sh && chmod +x /app/start.sh
# ---- RUNTIME ENVS --------------------------------------------------------- #
# Thread caps prevent RLIMIT_NPROC exhaustion in containers (issue #822)
ENV PATH="/app/.venv/bin:$PATH"     PYTHONDONTWRITEBYTECODE=1     PYTHONUNBUFFERED=1     TZ=Asia/Kolkata     APP_MODE=standalone     TMPDIR=/app/tmp     NUMBA_CACHE_DIR=/app/tmp/numba_cache     LLVMLITE_TMPDIR=/app/tmp     MPLCONFIGDIR=/app/tmp/matplotlib     OPENBLAS_NUM_THREADS=2     OMP_NUM_THREADS=2     MKL_NUM_THREADS=2     NUMEXPR_NUM_THREADS=2     NUMBA_NUM_THREADS=2     BROWSER_PATH=/usr/bin/chromium     CHROME_BIN=/usr/bin/chromium
USER appuser
EXPOSE 5000
CMD ["/app/start.sh"]
```

The block above reproduces the directives of the real `Dockerfile` with its longer rationale comments condensed. Read `Dockerfile` itself for the full commentary.

## Docker Compose

```yaml
# docker-compose.yaml (note the .yaml extension, not .yml)
services:
  openalgo:
    image: openalgo:latest
    build:
      context: .
      dockerfile: Dockerfile

    container_name: openalgo-web
    ports:
      - "${FLASK_PORT:-5000}:5000"
      - "${WEBSOCKET_PORT:-8765}:8765"

    # persistent DB, strategies, logs + mount the host .env read-only so dotenv can read it
    volumes:
      - openalgo_db:/app/db
      - openalgo_log:/app/log            # Application logs (named volume)
      - openalgo_strategies:/app/strategies  # Python strategies (named volume)
      - openalgo_keys:/app/keys          # API keys/certificates (named volume)
      - openalgo_tmp:/app/tmp            # Temporary directory for numba/scipy (named volume)
      - ./.env:/app/.env

    # (optional) extra env-vars that are NOT in .env
    environment:
      - FLASK_ENV=${FLASK_ENV:-production}
      - FLASK_DEBUG=${FLASK_DEBUG:-0}
      - TZ=Asia/Kolkata
      # Limit OpenBLAS/NumPy threads to prevent RLIMIT_NPROC exhaustion
      # See: https://github.com/marketcalls/openalgo/issues/822
      - OPENBLAS_NUM_THREADS=${OPENBLAS_NUM_THREADS:-2}
      - OMP_NUM_THREADS=${OMP_NUM_THREADS:-2}
      - MKL_NUM_THREADS=${MKL_NUM_THREADS:-2}
      - NUMEXPR_NUM_THREADS=${NUMEXPR_NUM_THREADS:-2}
      # Numba JIT compiler settings
      - NUMBA_NUM_THREADS=${NUMBA_NUM_THREADS:-2}
      # Strategy memory limit (MB) - reduce for low-memory containers
      # 2GB container with 5 strategies: set to 256
      - STRATEGY_MEMORY_LIMIT_MB=${STRATEGY_MEMORY_LIMIT_MB:-1024}

    # Shared memory for scipy/numba operations
    # Recommended: 25% of container RAM (min 128m, max 2g)
    # 2GB container: 256m | 4GB: 512m | 8GB: 1g | 16GB+: 2g
    shm_size: ${SHM_SIZE:-512m}

    healthcheck:
      test: ["CMD", "curl", "-f", "http://127.0.0.1:5000/auth/check-setup"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

    restart: unless-stopped

# Define named volumes for persistence
volumes:
  openalgo_db:
    driver: local
  openalgo_log:
    driver: local
  openalgo_strategies:
    driver: local
  openalgo_keys:
    driver: local
  openalgo_tmp:
    driver: local
```

### Named Volumes vs Bind Mounts

| Approach | Pros | Cons |
|----------|------|------|
| **Named Volumes** (recommended) | Better performance, managed by Docker | Data in Docker's volume directory |
| **Bind Mounts** (`./db:/app/db`) | Easy access to files | Permission issues possible |

## Directory Structure

```
Container /app/
├── .venv/                 # Python virtual environment
├── frontend/
│   └── dist/              # Built React frontend (from frontend-builder stage)
├── db/                    # SQLite databases (mounted volume)
│   ├── openalgo.db
│   ├── logs.db
│   ├── latency.db
│   ├── sandbox.db
│   └── historify.duckdb
├── log/                   # Log files (mounted volume)
│   └── strategies/
├── strategies/            # User strategies (mounted volume)
│   ├── scripts/
│   └── examples/
├── tmp/                   # Temporary files (internal volume)
│   ├── numba_cache/       # Numba JIT cache
│   └── matplotlib/        # Matplotlib config
├── keys/                  # Encryption keys (700 permissions)
├── .env                   # Environment configuration (666 for Railway)
├── start.sh               # Entrypoint script (246 lines)
├── upgrade/
│   └── migrate_all.py     # Database migrations (run on startup)
└── app.py                 # Main application
```

## Start Script

The `start.sh` script is a sophisticated 246-line entrypoint that handles:

1. **Railway/Cloud Environment Detection** - Auto-generates `.env` from environment variables
2. **Directory Setup** - Creates required directories with proper permissions
3. **Database Migrations** - Runs `upgrade/migrate_all.py` if present
4. **WebSocket Proxy** - Starts in background with PID tracking
5. **Signal Handling** - Graceful shutdown on SIGTERM/SIGINT
6. **Gunicorn Startup** - Eventlet worker with optimized settings

```bash
#!/bin/bash
# start.sh (simplified overview - actual script is 246 lines)

echo "[OpenAlgo] Starting up..."

# ============================================
# RAILWAY/CLOUD ENVIRONMENT DETECTION
# ============================================
# If HOST_SERVER is set and no .env exists, auto-generate .env
# with 40+ configuration variables including:
# - Broker configuration
# - Database URLs
# - CORS, CSP, CSRF settings
# - Rate limiting
# - WebSocket/ZeroMQ configuration

# ============================================
# DIRECTORY SETUP
# ============================================
for dir in db log log/strategies strategies strategies/scripts keys; do
    mkdir -p "$dir" 2>/dev/null || true
done

# ============================================
# DATABASE MIGRATIONS
# ============================================
if [ -f "/app/upgrade/migrate_all.py" ]; then
    /app/.venv/bin/python /app/upgrade/migrate_all.py
fi

# ============================================
# WEBSOCKET PROXY SERVER
# ============================================
/app/.venv/bin/python -m websocket_proxy.server &
WEBSOCKET_PID=$!

# ============================================
# SIGNAL HANDLING
# ============================================
cleanup() {
    echo "[OpenAlgo] Shutting down..."
    kill $WEBSOCKET_PID 2>/dev/null
    exit 0
}
trap cleanup SIGTERM SIGINT

# ============================================
# GUNICORN STARTUP
# ============================================
APP_PORT="${PORT:-5000}"  # Railway uses PORT env var
mkdir -p /tmp/gunicorn_workers

exec /app/.venv/bin/gunicorn \
    --worker-class eventlet \
    --workers 1 \
    --bind 0.0.0.0:${APP_PORT} \
    --timeout 300 \
    --graceful-timeout 30 \
    --worker-tmp-dir /tmp/gunicorn_workers \
    --log-level warning \
    app:app
```

### Key Differences from Simple Script

| Feature | Old (6 lines) | Actual (341 lines) |
|---------|---------------|-------------------|
| Cloud Support | None | Full Railway/Render support |
| .env Generation | None | 40+ variables auto-generated |
| Migrations | None | Auto-runs on startup |
| Signal Handling | None | Graceful shutdown |
| Timeout | 120s | 300s |
| Graceful Timeout | None | 30s |
| Worker Temp Dir | Default | /tmp/gunicorn_workers |
| Control Socket | Enabled | Disabled with `--no-control-socket` |
| Compromised-key preflight | None | Blocks startup on the known leaked `APP_KEY`/`API_KEY_PEPPER` when `.env` is not writable |

## Build Commands

```bash
# Build image
docker build -t openalgo .

# Run container
docker run -d \
  --name openalgo \
  -p 5000:5000 \
  -p 8765:8765 \
  -v $(pwd)/db:/app/db \
  -v $(pwd)/log:/app/log \
  -v $(pwd)/.env:/app/.env:ro \
  openalgo

# View logs
docker logs -f openalgo

# Stop container
docker stop openalgo

# Remove container
docker rm openalgo
```

## Docker Compose Commands

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and start
docker-compose up -d --build
```

## Environment Variables for Docker

```bash
# .env for Docker deployment
FLASK_HOST_IP=0.0.0.0           # Listen on all interfaces
FLASK_PORT=5000
FLASK_DEBUG=False
FLASK_ENV=production

WEBSOCKET_HOST=0.0.0.0
WEBSOCKET_PORT=8765
WEBSOCKET_URL=ws://localhost:8765

HOST_SERVER=http://your-domain.com  # External URL

DATABASE_URL=sqlite:///db/openalgo.db

# Security (generate unique values)
APP_KEY=your_32_byte_hex_key
API_KEY_PEPPER=your_32_byte_hex_pepper
```

## Resource Configuration for Python Strategies

Running Python strategies with numerical libraries (NumPy, SciPy, Numba) in Docker requires careful resource configuration to prevent `RLIMIT_NPROC` exhaustion errors.

### Thread Limiting Environment Variables

OpenBLAS, NumPy, and other numerical libraries spawn threads by default. In containers with limited process/thread limits, this causes crashes. The Dockerfile and docker-compose.yaml include these limits:

| Variable | Purpose | Default |
|----------|---------|---------|
| `OPENBLAS_NUM_THREADS` | OpenBLAS thread limit | 2 |
| `OMP_NUM_THREADS` | OpenMP thread limit | 2 |
| `MKL_NUM_THREADS` | Intel MKL thread limit | 2 |
| `NUMEXPR_NUM_THREADS` | NumExpr thread limit | 2 |
| `NUMBA_NUM_THREADS` | Numba JIT thread limit | 2 |

### Resource Scaling by Container RAM

| Container RAM | Thread Limit | Strategy Memory | SHM Size | Max Strategies |
|---------------|--------------|-----------------|----------|----------------|
| 2GB | 1 | 256MB | 256MB | 5 |
| 4GB | 2 | 512MB | 512MB | 5-8 |
| 8GB | 2-4 | 1024MB | 1GB | 10+ |
| 16GB+ | 4 | 1024MB | 2GB | 20+ |

### Configuration in docker-compose.yaml

```yaml
services:
  openalgo:
    environment:
      # Thread limits (adjust based on container RAM)
      - OPENBLAS_NUM_THREADS=${OPENBLAS_NUM_THREADS:-2}
      - OMP_NUM_THREADS=${OMP_NUM_THREADS:-2}
      - MKL_NUM_THREADS=${MKL_NUM_THREADS:-2}
      - NUMEXPR_NUM_THREADS=${NUMEXPR_NUM_THREADS:-2}
      - NUMBA_NUM_THREADS=${NUMBA_NUM_THREADS:-2}
      # Strategy memory limit (MB)
      - STRATEGY_MEMORY_LIMIT_MB=${STRATEGY_MEMORY_LIMIT_MB:-1024}
    # Shared memory for scipy/numba (25% of container RAM)
    shm_size: ${SHM_SIZE:-512m}
```

### Install Script Dynamic Calculation

The `install/install-docker.sh` script automatically calculates optimal values:

```bash
# Thread limits based on RAM
# <3GB: 1 thread | 3-6GB: 2 threads | 6GB+: min(4, cores)
if [ $TOTAL_RAM_MB -lt 3000 ]; then
    THREAD_LIMIT=1
elif [ $TOTAL_RAM_MB -lt 6000 ]; then
    THREAD_LIMIT=2
else
    THREAD_LIMIT=$((CPU_CORES < 4 ? CPU_CORES : 4))
fi
```

> **Reference**: See [GitHub Issue #822](https://github.com/marketcalls/openalgo/issues/822) for details on the RLIMIT_NPROC fix.

## Security Considerations

| Aspect | Implementation |
|--------|----------------|
| Non-root user | Runs as `appuser`, pinned to UID/GID 1000 so a host `.env` chowned to 1000 stays writable |
| .env mount | Bind-mounted read-write as `./.env:/app/.env`. It is deliberately not `:ro`, because `utils/env_check.py` rotates placeholder secrets in place on first run |
| Keys directory | 700 permissions |
| No build tools | Slim production image |
| Minimal packages | Only runtime dependencies |

## Volume Persistence

| Volume | Purpose | Required |
|--------|---------|----------|
| `/app/db` | SQLite databases | Yes |
| `/app/log` | Application logs | Recommended |
| `/app/strategies` | User strategies | Optional |
| `/app/keys` | Remote MCP OAuth signing keys | Yes when Remote MCP is enabled |
| `/app/tmp` | Numba, matplotlib and gunicorn scratch space | Yes |
| `/app/.env` | Configuration (bind mount, not a named volume) | Yes |

## Key Files Reference

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build configuration |
| `docker-compose.yaml` | Service orchestration |
| `start.sh` | Container entrypoint |
| `.dockerignore` | Build exclusions |
