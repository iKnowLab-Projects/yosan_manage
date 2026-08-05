"""외래 진료일 '일주일 전' 알림 메시지 (마일스톤별).

※ 문구는 연구팀 확정 시 이 파일만 수정하면 됩니다. (예시 기반)
"""

# 등록일 기준 외래 방문 마일스톤(개월). 이 시점의 '일주일 전'에 알림 발송.
MILESTONES = [6, 12, 18, 24]
# 며칠 전에 보낼지
LEAD_DAYS = 7
CATEGORY = "appointment"

TITLE = "귀하의 외래 진료일 일주일 전입니다."

# 마일스톤별 본문
_BODY_SURVEY_ONLY = (
    "진료 보기 전에 연구간호사와 설문지 작성을 하는 날입니다. "
    "대면이 어려우시면 전화 혹은 문자 부탁드립니다."
)
_BODY_6 = (
    "신분증과 통장 사본을 준비해주세요. "
    "진료 보기 전에 연구간호사와 인바디 측정 및 설문지 작성을 하는 날입니다. "
    "대면이 어려우시면 전화 혹은 문자 부탁드립니다."
)
_BODY_BLOOD = (
    "교통비 4만원을 받는 날입니다. "
    "진료 보기 전에 연구간호사와 채혈, 인바디 측정, 설문지 작성을 하는 날입니다. "
    "대면이 어려우시면 전화 혹은 문자 부탁드립니다."
)

_BODY_BY_MILESTONE = {
    6: _BODY_6,
    12: _BODY_BLOOD,
    18: _BODY_SURVEY_ONLY,
    24: _BODY_BLOOD,
}


def message_for(milestone: int) -> tuple[str, str]:
    """(제목, 본문) 반환."""
    return TITLE, _BODY_BY_MILESTONE.get(milestone, _BODY_SURVEY_ONLY)
