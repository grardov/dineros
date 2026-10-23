FROM python:3.13-slim

COPY --from=ghcr.io/astral-sh/uv:0.9.4 /uv /bin/uv

WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy PATH="/app/.venv/bin:$PATH"

COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-dev --no-install-project

COPY app ./app

# Fly terminates TLS; --proxy-headers keeps the client's scheme/IP from X-Forwarded-*.
CMD ["fastapi", "run", "--port", "8080", "--proxy-headers"]
