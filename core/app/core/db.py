from sqlmodel import create_engine

from app.core.config import settings

# ponytail: one sync engine with the default pool; with Supabase's transaction pooler (port 6543)
# add connect_args={"prepare_threshold": None}.
engine = create_engine(str(settings.DATABASE_URL), pool_pre_ping=True)
