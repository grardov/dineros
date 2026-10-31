import uuid

from fastapi import APIRouter, HTTPException, Response, UploadFile, status

from app.api.deps import StorageDep
from app.core.storage import MAX_SIZE, NAME, TYPES, sniff

router = APIRouter(prefix="/attachments", tags=["attachments"])


@router.post("/", status_code=status.HTTP_201_CREATED)
def upload_attachment(storage: StorageDep, file: UploadFile) -> dict[str, str]:
    """Stores an image or PDF for a note; the note then references it as /attachments/<name>."""
    data = file.file.read(MAX_SIZE + 1)
    if len(data) > MAX_SIZE:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, "Files go up to 4 MB")
    ext = sniff(data)
    if ext is None:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Only JPEG, PNG, WebP or PDF")
    name = f"{uuid.uuid4()}.{ext}"
    storage.upload(name, data)
    return {"name": name}


@router.get("/{name}")
def get_attachment(storage: StorageDep, name: str) -> Response:
    # Not yours and doesn't exist are the same 404: Storage's RLS only finds your own files.
    data = NAME.fullmatch(name) and storage.download(name)
    if not data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Attachment not found")
    return Response(
        data,
        media_type=TYPES[name.rsplit(".", 1)[1]],
        headers={"Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff"},
    )
