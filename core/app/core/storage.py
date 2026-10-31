import logging
import re
import uuid

import httpx

from app.core.config import settings

log = logging.getLogger(__name__)

BUCKET = "attachments"
MAX_SIZE = 4 * 1024 * 1024  # the bucket's file_size_limit
# <uuid>.<ext>, as uploads are named; anything else (e.g. "../x") is rejected before Storage.
NAME = re.compile(r"[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\.(?:jpg|png|webp|pdf)")
# How notes reference them: ![ticket.jpg](/attachments/<name>), [factura.pdf](/attachments/<name>).
_REF = re.compile(rf"/attachments/({NAME.pattern})")
TYPES = {"jpg": "image/jpeg", "png": "image/png", "webp": "image/webp", "pdf": "application/pdf"}

_http = httpx.Client(base_url=f"{settings.SUPABASE_URL}/storage/v1", timeout=30)


def sniff(data: bytes) -> str | None:
    """The file's extension from its first bytes. The browser's Content-Type isn't trusted: an
    HTML or SVG file renamed to .jpg is refused."""
    if data.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    if data.startswith(b"%PDF-"):
        return "pdf"
    return None


def referenced(notes: str | None) -> set[str]:
    return set(_REF.findall(notes or ""))


class Storage:
    """The user's folder in the attachments bucket, called with their own JWT: RLS on
    storage.objects checks every request, so not even a bug here reaches another user's files."""

    def __init__(self, token: str, user_id: uuid.UUID) -> None:
        self.folder = str(user_id)
        self.headers = {
            "apikey": settings.SUPABASE_PUBLISHABLE_KEY,
            "Authorization": f"Bearer {token}",
        }

    def upload(self, name: str, data: bytes) -> None:
        r = _http.post(
            f"/object/{BUCKET}/{self.folder}/{name}",
            content=data,
            headers=self.headers | {"Content-Type": TYPES[name.rsplit(".", 1)[1]]},
        )
        r.raise_for_status()

    def download(self, name: str) -> bytes | None:
        r = _http.get(f"/object/authenticated/{BUCKET}/{self.folder}/{name}", headers=self.headers)
        return r.content if r.is_success else None

    def clear(self) -> None:
        """Removes every file of the user, when their account goes. Best effort, like remove()."""
        try:
            while names := [
                o["name"]
                for o in _http.post(
                    f"/object/list/{BUCKET}",
                    json={"prefix": f"{self.folder}/", "limit": 1000},
                    headers=self.headers,
                )
                .raise_for_status()
                .json()
            ]:
                self._delete(names)
        except httpx.HTTPError:
            log.exception("Couldn't clear attachments of %s", self.folder)

    def remove(self, names: set[str] | list[str]) -> None:
        """Best effort: called after the DB commit, a failure only leaves an orphaned file."""
        try:
            self._delete(names)
        except httpx.HTTPError:
            log.exception("Couldn't remove attachments %s", names)

    def _delete(self, names: set[str] | list[str]) -> None:
        if names:
            _http.request(
                "DELETE",
                f"/object/{BUCKET}",
                json={"prefixes": [f"{self.folder}/{n}" for n in names]},
                headers=self.headers,
            ).raise_for_status()
