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
cp core/.env.example core/.env   # opcional: los defaults apuntan a Supabase local
cp web/.env.example web/.env.local
```

Los tests de `core` (`cd core && uv run pytest`) usan Supabase local: crean usuarios reales.

## Desarrollo

```bash
pnpm db:start    # Supabase local (Studio en http://localhost:55323)
pnpm dev:core    # API en http://localhost:8100 (docs en /docs)
pnpm dev:web     # Web en http://localhost:3000
```

Migraciones: `pnpm --filter db migration:new <nombre>` y `pnpm --filter db reset`.

## Calidad de código

`pnpm lint` revisa Prettier, ESLint y tipos (`tsc`) en `web` y Ruff en `core`; `pnpm format`
corrige Prettier y Ruff. Indentación y finales de línea se definen en `.editorconfig` (2 espacios;
4 en Python).

## CI/CD

Ramas: los PRs van a `staging`; `main` es producción.

- **CI** ([`ci.yml`](.github/workflows/ci.yml)), en cada PR y push a `staging`: `pnpm lint` y los
  tests de `core` contra un Supabase local.
- **Deploy** ([`deploy.yml`](.github/workflows/deploy.yml)), en cada push a `main`: CI →
  `supabase db push` (migraciones a producción) → `flyctl deploy` de `core`. Las migraciones van
  primero para que el código nuevo nunca corra contra un esquema viejo.
- **web** se despliega solo con la integración Git de Vercel.
- **Release:** al terminar el deploy, si la versión del `package.json` raíz no tiene release, crea
  el tag `vX.Y.Z` y su GitHub Release con notas generadas.

### Títulos de PR

Los PRs a `staging` se hacen squash, así que su título es el commit. Sigue
[Conventional Commits](https://www.conventionalcommits.org): `<tipo>[(scope)][!]: <resumen>`, p. ej.
`feat(web): Share CLABE without opening the bank app`. [`pr.yml`](.github/workflows/pr.yml) lo
valida y pone el tipo como label.

| Tipo       | Para                                                    | Versión |
| ---------- | ------------------------------------------------------- | ------- |
| `feat`     | Algo nuevo o mejorado que el usuario nota               | minor   |
| `fix`      | Un bug                                                  | patch   |
| `perf`     | Más rápido, mismo comportamiento                        | patch   |
| `refactor` | Cambia código sin cambiar comportamiento                | patch   |
| `docs`     | Solo documentación                                      | patch   |
| `chore`    | CI, dependencias, tooling, releases (`chore(ci): ...`)  | patch   |
| `<tipo>!`  | Rompe algo: datos, API o flujos que el usuario ya usaba | major   |

### Hacer un release

En `staging`, `scripts/release.sh` sube la versión según los títulos desde el último release, hace
el commit y abre el PR a `main`. `scripts/release.sh minor` fuerza el nivel. Las notas del release
se agrupan por label ([`release.yml`](.github/release.yml)).

Haz merge con **merge commit** (no squash) para que `staging` y `main` no diverjan.

### Setup inicial (una vez)

1. **Supabase:** crea el proyecto. En _Authentication > URL Configuration_ pon la URL de Vercel
   como Site URL y en Redirect URLs.
2. **Fly** (`core/fly.toml`):
   ```bash
   cd core && fly apps create dineros-core
   fly secrets set DATABASE_URL="<Session pooler>" SUPABASE_URL="https://<ref>.supabase.co" \
     SUPABASE_PUBLISHABLE_KEY="<publishable key>"
   fly tokens create deploy
   ```
3. **GitHub:** en _Settings > Environments_ crea `production` con los secrets `SUPABASE_DB_URL`
   (connection string de Supabase con contraseña) y `FLY_API_TOKEN`.
4. **Vercel:** Root Directory `web`, **Production Branch `main`** (el default del repo es
   `staging`), y las variables `CORE_API_URL=https://dineros-core.fly.dev/api/v1`,
   `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`.

## Arquitectura

```
web (Next.js) ──HTTP──▶ core (FastAPI) ──SQL──▶ db (Postgres de Supabase)
```

- **Solo `core` se conecta a la base de datos.** `web` usa `supabase-js` únicamente para auth
  (cookies de sesión); los datos los pide a `core` con `api()` de
  [`web/lib/api.ts`](web/lib/api.ts), que es `server-only` y manda el JWT del usuario.
- **`db/` es la única fuente del esquema.** Las tablas se crean con migraciones del CLI de
  Supabase; los modelos de `core` reflejan esas tablas (no hay Alembic ni `create_all`).

### Auth y aislamiento por usuario

1. **Supabase Auth** (correo + contraseña) emite el JWT. [`web/proxy.ts`](web/proxy.ts) refresca
   la sesión en cada request y manda a `/login` a quien no la tenga.
2. **`core` rechaza toda llamada sin JWT válido** (firma por JWKS, `aud` e `iss`), incluido el
   health check: [`core/app/api/deps.py`](core/app/api/deps.py).
3. **RLS hace el aislamiento.** `SessionDep` corre cada transacción como el rol `authenticated`
   con los claims del usuario, así que `auth.uid()` y las políticas de Postgres filtran todo; un
   `select` sin `where user_id` solo ve lo del usuario. FKs compuestas `(…, user_id)` impiden
   apuntar a cuentas o categorías ajenas. `anon` no tiene permisos sobre ninguna tabla.

### Modelo de datos

Migración: [`db/supabase/migrations/…_init_datamodel.sql`](db/supabase/migrations/).

| Tabla / vista            | Qué guarda                                                                                                                               |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `accounts`               | Débito, crédito, efectivo, ahorro, inversión. Las de crédito llevan límite, día de corte y día límite de pago                            |
| `categories`             | De gasto o ingreso, con subcategorías y un emoji. Cada usuario nuevo recibe un set inicial editable                                      |
| `transactions`           | `expense`, `income` o `transfer` (pago de tarjeta, ahorro, inversión = transferencia entre cuentas propias), con tags, notas y ubicación |
| `account_balances`       | Saldo de cada cuenta (crédito: deuda en negativo) y crédito disponible                                                                   |
| `credit_card_statements` | Cortes por tarjeta: cargos del periodo, saldo al corte, pagos y pendiente                                                                |

Montos en `numeric(14,2)`, positivos; el signo lo da el tipo de movimiento. Moneda por cuenta
(`MXN` por default), sin conversión.

### Agregar una entidad

1. **Esquema:** `pnpm --filter db migration:new create_<entidad>`, escribe el SQL
   con `user_id uuid not null default auth.uid()`, RLS con la política `user_id = auth.uid()`,
   `grant` a `authenticated` (y `revoke` a `anon`), y aplica con `pnpm --filter db reset`.
2. **Modelo:** en `core/app/models.py`, `<Entidad>Create` (entrada) y `<Entidad>` con
   `table=True` (respuesta).
3. **Rutas:** `core/app/api/routes/<entidad>.py` con su `APIRouter`; cada endpoint recibe
   `session: SessionDep` (de `app/api/deps.py`) y, al crear, asigna `user_id: CurrentUserId`.
   Inclúyelo en `core/app/api/main.py`.
4. **Web:** `await api<Entidad[]>("/<entidad>/")` desde un Server Component, dentro de un
   `<Suspense>` (con Cache Components, los datos sin cache se transmiten por streaming).

## Estructura de `core/`

Sigue el [template oficial de FastAPI](https://github.com/fastapi/full-stack-fastapi-template):

```
app/
  main.py          # crea la app y monta los routers
  core/config.py   # Settings (pydantic-settings, lee .env)
  core/db.py       # engine de SQLModel (psycopg)
  models.py        # SQLModel de tablas y vistas
  api/deps.py      # auth (JWT de Supabase) y SessionDep con RLS del usuario
  api/main.py      # api_router que agrupa las rutas
  api/routes/      # un módulo APIRouter por recurso
tests/
```
