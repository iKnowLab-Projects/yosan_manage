import logging

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import Base, SessionLocal, engine
from app.models.content import Announcement, CardNews
from app.models.inbody import InBodyResult  # noqa: F401  (create_all 등록용)
from app.models.view import ContentView  # noqa: F401  (create_all 등록용)
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)

SAMPLE_CARD_IMAGES = [
    "cardnews_sample1",
    "cardnews_sample2",
    "cardnews_sample3",
]


def _migrate() -> None:
    """create_all 로 처리되지 않는 컬럼 추가를 보정 (Postgres, 멱등)."""
    with engine.begin() as conn:
        conn.execute(
            text("ALTER TABLE card_news ADD COLUMN IF NOT EXISTS images JSON")
        )
        # 컬럼 추가 이전에 생성된 카드뉴스(NULL)를 데모용 샘플 이미지로 backfill
        conn.execute(
            text(
                "UPDATE card_news SET images = CAST(:imgs AS JSON) WHERE images IS NULL"
            ),
            {"imgs": '["cardnews_sample1", "cardnews_sample2", "cardnews_sample3"]'},
        )
        # 카드뉴스 게시자
        conn.execute(
            text("ALTER TABLE card_news ADD COLUMN IF NOT EXISTS author VARCHAR(100)")
        )
        # 카드뉴스 첨부 동영상
        conn.execute(
            text("ALTER TABLE card_news ADD COLUMN IF NOT EXISTS video_key VARCHAR(300)")
        )
        # 설문 제출로 자동 완료된 마일리지 → 해당 제출 연결
        conn.execute(
            text(
                "ALTER TABLE mileage_completions "
                "ADD COLUMN IF NOT EXISTS survey_submission_id INTEGER"
            )
        )


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    _migrate()
    db: Session = SessionLocal()
    try:
        admin = db.query(User).filter(User.email == settings.seed_admin_email).first()
        if not admin:
            admin = User(
                email=settings.seed_admin_email,
                hashed_password=hash_password(settings.seed_admin_password),
                name="관리자",
                role=UserRole.ADMIN,
            )
            db.add(admin)
            db.commit()
            logger.info("Seed admin created: %s", settings.seed_admin_email)

        _seed_content(db)
    finally:
        db.close()


def _seed_content(db: Session) -> None:
    """공지/FAQ, 카드뉴스 샘플 데이터 시드 (최초 1회)."""
    if db.query(Announcement).count() == 0:
        db.add_all(
            [
                Announcement(
                    title="요산 관리 앱 사용 안내",
                    body=(
                        "안녕하세요. 통풍식이 마일리지 앱에 오신 것을 환영합니다.\n\n"
                        "매월 마일리지 화면에서 당월 활동을 완료하면 보상이 적립됩니다. "
                        "궁금한 점은 본 게시판의 자주 묻는 질문을 확인해 주세요."
                    ),
                    category="notice",
                    is_pinned=True,
                ),
                Announcement(
                    title="[FAQ] 마일리지는 어떻게 적립되나요?",
                    body=(
                        "마일리지는 매월 정해진 활동(설문 응답, 병원 방문 등)을 완료할 때 적립됩니다.\n"
                        "마일리지 화면에서 깜빡이는 당월 항목을 눌러 설문을 진행하세요."
                    ),
                    category="faq",
                ),
                Announcement(
                    title="[FAQ] 요산 수치는 어떻게 관리하나요?",
                    body=(
                        "충분한 수분 섭취, 퓨린이 높은 음식 절제, 규칙적인 운동이 도움이 됩니다.\n"
                        "자세한 식이 정보는 홈 화면의 카드뉴스를 참고해 주세요."
                    ),
                    category="faq",
                ),
            ]
        )
        db.commit()
        logger.info("Seed announcements created")

    if db.query(CardNews).count() == 0:
        db.add_all(
            [
                CardNews(
                    title="통풍, 식이로 관리하기",
                    author="요산 관리팀",
                    summary="퓨린이 높은 음식과 낮은 음식을 한눈에",
                    body=(
                        "통풍 관리의 첫걸음은 식이 조절입니다. 붉은 고기, 내장류, 등푸른 생선 등 "
                        "퓨린이 높은 음식은 줄이고, 채소와 저지방 유제품을 늘려보세요."
                    ),
                    image_key="cardnews_sample1",
                    images=list(SAMPLE_CARD_IMAGES),
                    display_order=1,
                ),
                CardNews(
                    title="물 마시기가 중요한 이유",
                    author="요산 관리팀",
                    summary="하루 2L 수분 섭취로 요산 배출 돕기",
                    body=(
                        "충분한 수분 섭취는 요산을 소변으로 배출하는 데 도움을 줍니다. "
                        "하루 2L 이상의 물을 꾸준히 마시는 습관을 들여보세요."
                    ),
                    image_key="cardnews_sample2",
                    images=list(SAMPLE_CARD_IMAGES),
                    display_order=2,
                ),
                CardNews(
                    title="꾸준한 운동과 체중 관리",
                    author="요산 관리팀",
                    summary="적정 체중 유지가 통풍 발작을 줄입니다",
                    body=(
                        "비만은 통풍 발작의 위험을 높입니다. 무리하지 않는 선에서 규칙적인 유산소 "
                        "운동으로 적정 체중을 유지하는 것이 좋습니다."
                    ),
                    image_key="cardnews_sample3",
                    images=list(SAMPLE_CARD_IMAGES),
                    display_order=3,
                ),
            ]
        )
        db.commit()
        logger.info("Seed card news created")
