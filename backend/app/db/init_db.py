import logging

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import Base, SessionLocal, engine
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
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
    finally:
        db.close()
