# Dineros

Monorepo para llevar finanzas personales y tomar decisiones.

| Directorio | Stack                             |
| ---------- | --------------------------------- |
| `web/`     | Next.js 16 (App Router, Tailwind) |
| `db/`      | Supabase (CLI local, migraciones) |
| `core/`    | FastAPI + uv (Python 3.13)        |

## Requisitos

Node 22, pnpm, [uv](https://docs.astral.sh/uv/), Docker (para Supabase local).

## Setup

```bash
pnpm install
cd core && uv sync
```

## Desarrollo

```bash
pnpm db:start    # Supabase local (Studio en http://localhost:54323)
pnpm dev:core    # API en http://localhost:8000 (docs en /docs)
pnpm dev:web     # Web en http://localhost:3000
```

Migraciones: `pnpm --filter db migration:new <nombre>` y `pnpm --filter db reset`.

## Calidad de código

`pnpm lint` y `pnpm format` corren ESLint/Prettier en `web` y Ruff en `core`.
Indentación y finales de línea se definen en `.editorconfig` (2 espacios; 4 en Python).

## Estructura de `core/`

Sigue el [template oficial de FastAPI](https://github.com/fastapi/full-stack-fastapi-template):

```
app/
  main.py          # crea la app, middleware, monta routers
  core/config.py   # Settings (pydantic-settings, lee .env)
  api/main.py      # api_router que agrupa las rutas
  api/routes/      # un módulo APIRouter por recurso
tests/
```
