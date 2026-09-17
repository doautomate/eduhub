"""Curated, predefined security-question reference data (spec Assumptions: users choose
from a short predefined list rather than a free-text custom question).

Only `code` is ever persisted on a `User` row (`security_question_code`); `question_text`
is resolved from this list for display, mirrored on the frontend in
`frontend/src/data/securityQuestions.ts`.
"""

from __future__ import annotations

from typing import TypedDict


class SecurityQuestionEntry(TypedDict):
    code: str
    question_text: str


SECURITY_QUESTIONS: list[SecurityQuestionEntry] = [
    {"code": "FIRST_PET", "question_text": "What was the name of your first pet?"},
    {"code": "BIRTH_CITY", "question_text": "In what city were you born?"},
    {"code": "MOTHER_MAIDEN_NAME", "question_text": "What is your mother's maiden name?"},
    {"code": "FIRST_SCHOOL", "question_text": "What was the name of your first school?"},
    {"code": "FAVORITE_TEACHER", "question_text": "Who was your favorite teacher?"},
]

_VALID_SECURITY_QUESTION_CODES = {q["code"] for q in SECURITY_QUESTIONS}


def is_valid_security_question_code(code: str) -> bool:
    return code in _VALID_SECURITY_QUESTION_CODES


def get_question_text(code: str) -> str | None:
    for question in SECURITY_QUESTIONS:
        if question["code"] == code:
            return question["question_text"]
    return None
