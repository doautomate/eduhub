FROM python:3.12-slim@sha256:78387bc3881b8273120a12ebe6c1ab22b018ccc2c9adf565ae1ac9b536e184ea AS builder

# Ensure uv can validate the package index certificate in the slim image.
RUN apt-get update \
	&& apt-get install -y --no-install-recommends ca-certificates \
	&& rm -rf /var/lib/apt/lists/*

# Install uv by copying it directly from the official image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Set working directory and environment variables
WORKDIR /app
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy
ENV UV_NATIVE_TLS=1

# 1. Copy only dependency files first to maximize Docker caching
COPY pyproject.toml uv.lock ./

# 2. Install dependencies without the application code or dev packages
RUN uv sync --frozen --no-install-project --no-dev

# 3. Copy the rest of your application code
COPY . .

FROM builder AS ci

# CI-only stage: adds the `dev` dependency group (ruff, mypy, pytest, pip-audit, bandit,
# diff-cover) on top of the already-synced production deps. Never used by the `runtime`
# stage below, so the shipped production image stays dev-dependency-free.
RUN uv sync --frozen --no-install-project --extra dev

FROM python:3.12-slim@sha256:78387bc3881b8273120a12ebe6c1ab22b018ccc2c9adf565ae1ac9b536e184ea AS runtime

WORKDIR /app

COPY --from=builder /app /app

# Place the virtual environment's executable directory on the PATH
ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000

CMD ["uvicorn", "src.app:app", "--host", "0.0.0.0", "--port", "8000"]
