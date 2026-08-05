import asyncio
import logging
import mimetypes
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response, StreamingResponse

from app.api.v1.endpoints.uploads import UPLOAD_DIR
from app.api.v1.router import api_router
from app.core.config import settings
from app.db.init_db import init_db
from app.db.session import SessionLocal
from app.services.reminders import run_appointment_reminders

logging.basicConfig(level=logging.INFO)

# 일부 환경(mimetypes 미등록)에서도 영상 Content-Type 이 올바르게 나가도록 보강
mimetypes.add_type("video/mp4", ".mp4")
mimetypes.add_type("video/quicktime", ".mov")
mimetypes.add_type("video/x-m4v", ".m4v")
mimetypes.add_type("video/webm", ".webm")

app = FastAPI(title="요산 환자 모니터링 API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# 업로드 파일 서빙 (/uploads/<파일명>) — HTTP Range(206) 지원.
# 네이티브 영상 플레이어(AVPlayer/ExoPlayer)는 progressive MP4 스트리밍에
# byte-range 응답이 필수라, 기본 StaticFiles(range 미지원) 대신 직접 처리한다.
@app.get("/uploads/{filename}")
def serve_upload(filename: str, request: Request) -> Response:
    safe = Path(filename).name  # 경로 조작 방지
    path = UPLOAD_DIR / safe
    if not path.is_file():
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")

    file_size = path.stat().st_size
    content_type = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
    base_headers = {"Accept-Ranges": "bytes", "Cache-Control": "public, max-age=86400"}

    range_header = request.headers.get("range")
    if not range_header or not range_header.lower().startswith("bytes="):
        return FileResponse(path, media_type=content_type, headers=base_headers)

    # "bytes=start-end" 파싱 (start/end 일부 생략 허용)
    try:
        start_s, end_s = range_header.split("=", 1)[1].split("-", 1)
        start = int(start_s) if start_s else 0
        end = int(end_s) if end_s else file_size - 1
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Range header")

    if start >= file_size or start > end:
        return Response(
            status_code=416,
            headers={**base_headers, "Content-Range": f"bytes */{file_size}"},
        )
    end = min(end, file_size - 1)
    length = end - start + 1

    def iter_file(chunk_size: int = 512 * 1024):
        with open(path, "rb") as f:
            f.seek(start)
            remaining = length
            while remaining > 0:
                data = f.read(min(chunk_size, remaining))
                if not data:
                    break
                remaining -= len(data)
                yield data

    headers = {
        **base_headers,
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Content-Length": str(length),
    }
    return StreamingResponse(
        iter_file(), status_code=206, media_type=content_type, headers=headers
    )


def _run_reminders_once() -> None:
    db = SessionLocal()
    try:
        run_appointment_reminders(db)
    finally:
        db.close()


async def _appointment_reminder_loop() -> None:
    """매일 1회 외래 진료일 알림 점검·발송. (중복은 DB unique 로 방지)"""
    while True:
        try:
            await asyncio.to_thread(_run_reminders_once)
        except Exception:  # noqa: BLE001
            logging.exception("[reminders] 스케줄러 오류")
        await asyncio.sleep(24 * 60 * 60)


@app.on_event("startup")
async def on_startup() -> None:
    init_db()
    asyncio.create_task(_appointment_reminder_loop())


@app.get("/health", tags=["meta"])
def health() -> dict:
    return {"status": "ok"}
