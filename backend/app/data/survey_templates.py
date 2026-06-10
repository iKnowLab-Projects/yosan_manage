"""설문 템플릿 정적 데이터.

xlsx 원본:
- 어플 삽입 설문지-B군.xlsx  →  SURVEY_B (저요산식단 FFQ + MARS-5)
- 어플 삽입 설문지-C군.xlsx  →  SURVEY_C (DASH식단 FFQ + MARS-5)

각 설문은 (1) 식이 빈도 11문항 + (2) MARS-5 5문항으로 구성.
선택지의 순서/문구는 원본 xlsx를 그대로 유지한다.
"""

from __future__ import annotations

from typing import Literal, TypedDict

SurveyGroup = Literal["B", "C"]


class Question(TypedDict):
    code: str
    text: str
    options: list[str]


class SurveyTemplate(TypedDict):
    group: SurveyGroup
    name: str
    description: str
    sections: list[dict]  # {"title": str, "questions": list[Question]}


# 공통 MARS-5 복약 행동
MARS5_OPTIONS = ["항상", "자주", "가끔", "거의 안함", "전혀"]

MARS5_QUESTIONS: list[Question] = [
    {"code": "MARS_1", "text": "약을 복용하는 것을 잊은 적이 있다.", "options": MARS5_OPTIONS},
    {"code": "MARS_2", "text": "복용량을 바꾼 적이 있다(줄이거나 늘린다).", "options": MARS5_OPTIONS},
    {"code": "MARS_3", "text": "잠시 약 복용을 중단한 적이 있다.", "options": MARS5_OPTIONS},
    {"code": "MARS_4", "text": "일부 복용분을 먹지 않은 적이 있다.", "options": MARS5_OPTIONS},
    {"code": "MARS_5", "text": "처방된 용량보다 적게 복용한 적이 있다.", "options": MARS5_OPTIONS},
]

# B군 — 저요산식단 식이 빈도
B_FOOD_QUESTIONS: list[Question] = [
    {
        "code": "B_FOOD_1",
        "text": "붉은 육류(소고기, 돼지고기), 내장류(간, 곱창 등)",
        "options": ["거의 안 먹음", "주 1회 미만", "주 2-3회", "주 3회 이상"],
    },
    {
        "code": "B_FOOD_2",
        "text": "등푸른 생선, 해산물(고등어, 꽁치, 참치, 새우, 조개, 홍합)",
        "options": ["거의 안 먹음", "주 1회 미만", "주 2-3회", "주 3회 이상"],
    },
    {
        "code": "B_FOOD_3",
        "text": "음주",
        "options": ["거의 안 먹음", "주 1-2회", "주 3회 이상"],
    },
    {
        "code": "B_FOOD_4",
        "text": "단음료(탄산음료, 시럽 넣은 커피, 차, 주스 등)",
        "options": ["거의 안 먹음", "주 1-2회", "주 3-4회", "거의 매일"],
    },
    {
        "code": "B_FOOD_5",
        "text": "통곡물(현미밥, 보리밥, 통밀빵 등) *귀리는 제외",
        "options": ["거의 안 먹음", "주 1-2회", "주 3-4회", "거의 매일"],
    },
    {
        "code": "B_FOOD_6",
        "text": "콩, 두부, 달걀",
        "options": ["거의 안 먹음", "주 1-2회", "주 3-4회", "거의 매일"],
    },
    {
        "code": "B_FOOD_7",
        "text": "신선한 채소(아스파라거스, 버섯, 시금치, 브로콜리 제외)",
        "options": ["거의 안 먹음", "하루 1회", "하루 2회", "하루 3회 이상"],
    },
    {
        "code": "B_FOOD_8",
        "text": "생과일",
        "options": ["거의 안 먹음", "주 3-4회", "하루 1회", "하루 2회 이상"],
    },
    {
        "code": "B_FOOD_9",
        "text": "저지방(또는 무지방)우유, 요거트",
        "options": ["거의 안 먹음", "주 1-2회", "주 3-4회", "하루 1회 이상"],
    },
    {
        "code": "B_FOOD_10",
        "text": "물(200mL/컵 기준)",
        "options": ["하루 3컵 미만", "하루 3-4컵", "하루 5-6컵", "하루 6컵 이상"],
    },
    {
        "code": "B_FOOD_11",
        "text": "평소 식사에서 동물성 식품과 식물성 식품 비율",
        "options": [
            "동물성 식품이 훨씬 많음",
            "동물성 식품이 약간 많음",
            "비슷함",
            "식물성 식품이 많음",
        ],
    },
]

# C군 — DASH식단 식이 빈도
C_FOOD_QUESTIONS: list[Question] = [
    {
        "code": "C_FOOD_1",
        "text": "신선한 채소(김치제외)",
        "options": ["거의 안 먹음", "하루 1회", "하루 2회", "하루 3회 이상"],
    },
    {
        "code": "C_FOOD_2",
        "text": "생과일 또는 100% 과일 주스",
        "options": ["거의 안 먹음", "주 3-4회", "하루 1회", "하루 2회 이상"],
    },
    {
        "code": "C_FOOD_3",
        "text": "통곡물: 현미밥, 잡곡밥, 통밀빵, 통밀면 등",
        "options": ["거의 안 먹음", "하루 1회", "하루 2회", "하루 2회 이상"],
    },
    {
        "code": "C_FOOD_4",
        "text": "콩류, 두부, 콩제품",
        "options": ["거의 안 먹음", "주 1-2회", "주 3-4회", "거의 매일"],
    },
    {
        "code": "C_FOOD_5",
        "text": "저지방(또는 무지방) 우유, 요거트, 치즈",
        "options": ["거의 안 먹음", "주 1-2회", "주 3-4회", "거의 매일"],
    },
    {
        "code": "C_FOOD_6",
        "text": "생선, 해산물",
        "options": ["거의 안 먹음", "주 1-2회", "주 3-4회", "거의 매일"],
    },
    {
        "code": "C_FOOD_7",
        "text": "붉은 육류(소고기, 돼지고기), 가공육(햄, 치즈, 베이컨 등)",
        "options": ["거의 안 먹음", "주 1-2회", "주 3-4회", "거의 매일"],
    },
    {
        "code": "C_FOOD_8",
        "text": "단음료(탄산음료, 시럽 넣은 커피, 차, 주스 등)",
        "options": ["거의 안 먹음", "주 1-2회", "주 3-4회", "거의 매일"],
    },
    {
        "code": "C_FOOD_9",
        "text": "튀김, 크림소스, 버터, 마요네즈 들어간 음식",
        "options": ["거의 안 먹음", "주 1-2회", "주 3-4회", "거의 매일"],
    },
    {
        "code": "C_FOOD_10",
        "text": "라면, 햄버거, 치킨, 피자 등 가공식품 / 패스트푸드",
        "options": ["거의 안 먹음", "주 1-2회", "주 3-4회", "거의 매일"],
    },
    {
        "code": "C_FOOD_11",
        "text": "식사의 짠 정도(국, 찌개 국물까지 포함)",
        "options": ["매우 짜게", "약간 짜게", "보통", "싱겁게"],
    },
]

SURVEY_B: SurveyTemplate = {
    "group": "B",
    "name": "B군 — 저요산식단 + 복약 행동",
    "description": "지난 한 달간의 식이 빈도와 복약 행동을 평가합니다.",
    "sections": [
        {"title": "식이 빈도 (FFQ)", "questions": B_FOOD_QUESTIONS},
        {"title": "복약 행동 (MARS-5)", "questions": MARS5_QUESTIONS},
    ],
}

SURVEY_C: SurveyTemplate = {
    "group": "C",
    "name": "C군 — DASH식단 + 복약 행동",
    "description": "지난 한 달간의 DASH 식단 준수도와 복약 행동을 평가합니다.",
    "sections": [
        {"title": "식이 빈도 (DASH)", "questions": C_FOOD_QUESTIONS},
        {"title": "복약 행동 (MARS-5)", "questions": MARS5_QUESTIONS},
    ],
}

TEMPLATES: dict[str, SurveyTemplate] = {"B": SURVEY_B, "C": SURVEY_C}


def get_template(group: str) -> SurveyTemplate | None:
    return TEMPLATES.get(group)


def all_question_codes(group: str) -> set[str]:
    tpl = TEMPLATES.get(group)
    if not tpl:
        return set()
    return {q["code"] for section in tpl["sections"] for q in section["questions"]}


def question_options(group: str, code: str) -> list[str] | None:
    tpl = TEMPLATES.get(group)
    if not tpl:
        return None
    for section in tpl["sections"]:
        for q in section["questions"]:
            if q["code"] == code:
                return q["options"]
    return None
