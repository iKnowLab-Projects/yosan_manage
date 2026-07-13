import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status

from app.api.deps import require_admin
from app.models.user import User

router = APIRouter(prefix="/uploads", tags=["uploads"])

# 저장 위치: backend/uploads (StaticFiles 마운트 경로 /uploads 와 일치해야 함)
# __file__ = backend/app/api/v1/endpoints/uploads.py → parents[4] = backend
UPLOAD_DIR = Path(__file__).resolve().parents[4] / "uploads"

ALLOWED_EXT = {".png", ".jpg", ".jpeg", ".gif", ".webp"}
MAX_BYTES = 10 * 1024 * 1024  # 10MB


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: UploadFile,
    _: User = Depends(require_admin),
) -> dict:
    """관리자 이미지 업로드. 저장 후 접근 가능한 URL(`/uploads/<파일명>`)을 반환.

    반환된 `key`(=url)를 카드뉴스 image_key/images 또는 InBody image_key 로 저장한다.
    """
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(
            status_code=400,
            detail=f"허용되지 않는 형식입니다. ({', '.join(sorted(ALLOWED_EXT))})",
        )

    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="파일이 너무 큽니다. (최대 10MB)")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex}{ext}"
    (UPLOAD_DIR / name).write_bytes(data)

    url = f"/uploads/{name}"
    return {"url": url, "key": url}
