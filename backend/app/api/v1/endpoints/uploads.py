import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status

from app.api.deps import require_admin
from app.models.user import User

router = APIRouter(prefix="/uploads", tags=["uploads"])

# 저장 위치: backend/uploads (StaticFiles 마운트 경로 /uploads 와 일치해야 함)
# __file__ = backend/app/api/v1/endpoints/uploads.py → parents[4] = backend
UPLOAD_DIR = Path(__file__).resolve().parents[4] / "uploads"

ALLOWED_IMAGE_EXT = {".png", ".jpg", ".jpeg", ".gif", ".webp"}
ALLOWED_VIDEO_EXT = {".mp4", ".mov", ".m4v", ".webm"}
ALLOWED_EXT = ALLOWED_IMAGE_EXT | ALLOWED_VIDEO_EXT
MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10MB
MAX_VIDEO_BYTES = 100 * 1024 * 1024  # 100MB


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: UploadFile,
    _: User = Depends(require_admin),
) -> dict:
    """관리자 이미지/동영상 업로드. 저장 후 접근 가능한 URL(`/uploads/<파일명>`)을 반환.

    반환된 `key`(=url)를 카드뉴스 image_key/images/video_key 또는 InBody image_key 로 저장한다.
    """
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(
            status_code=400,
            detail=f"허용되지 않는 형식입니다. ({', '.join(sorted(ALLOWED_EXT))})",
        )

    is_video = ext in ALLOWED_VIDEO_EXT
    limit = MAX_VIDEO_BYTES if is_video else MAX_IMAGE_BYTES
    data = await file.read()
    if len(data) > limit:
        mb = limit // (1024 * 1024)
        raise HTTPException(status_code=400, detail=f"파일이 너무 큽니다. (최대 {mb}MB)")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex}{ext}"
    (UPLOAD_DIR / name).write_bytes(data)

    url = f"/uploads/{name}"
    return {"url": url, "key": url}
