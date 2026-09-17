"""User persistence (async SQLAlchemy)."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.encryption import blind_index, encrypt_field
from src.core.exceptions import MobileNumberAlreadyRegisteredError
from src.models.user import User


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_email(self, email: str) -> User | None:
        normalized = email.strip().lower()
        result = await self._session.execute(select(User).where(User.email == normalized))
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: str | uuid.UUID) -> User | None:
        try:
            normalized_id = user_id if isinstance(user_id, uuid.UUID) else uuid.UUID(str(user_id))
        except ValueError:
            return None
        result = await self._session.execute(select(User).where(User.id == normalized_id))
        return result.scalar_one_or_none()

    async def get_by_mobile_number(self, mobile_number: str) -> User | None:
        """Look up by the deterministic blind-index hash, since `mobile_number` itself is
        now stored encrypted (FR-017) and can no longer be searched directly."""
        lookup_hash = blind_index(mobile_number.strip())
        result = await self._session.execute(
            select(User).where(User.mobile_number_lookup_hash == lookup_hash)
        )
        return result.scalar_one_or_none()

    async def create(
        self,
        email: str,
        password_hash: str,
        first_name: str,
        last_name: str,
        mobile_number_encrypted: str,
        mobile_number_lookup_hash: str,
        country: str,
        state_province: str,
        pin_code: str,
        date_of_birth_encrypted: str,
        security_question_code: str,
        security_answer_hash: str,
    ) -> User:
        user = User(
            email=email.strip().lower(),
            password_hash=password_hash,
            first_name=first_name.strip(),
            last_name=last_name.strip(),
            mobile_number=mobile_number_encrypted,
            mobile_number_lookup_hash=mobile_number_lookup_hash,
            country=country.strip().upper(),
            state_province=state_province.strip().upper(),
            pin_code=pin_code.strip(),
            date_of_birth_encrypted=date_of_birth_encrypted,
            security_question_code=security_question_code,
            security_answer_hash=security_answer_hash,
            is_verified=False,
        )
        self._session.add(user)
        await self._session.commit()
        await self._session.refresh(user)
        return user

    async def update_address(
        self,
        user_id: str,
        country: str,
        state_province: str,
        pin_code: str,
        house_number: str | None = None,
        apartment_building: str | None = None,
    ) -> User | None:
        """Update the address fields for an existing user (US5, FR-019; extended by
        013-profile-popover-management FR-011 with two new optional fields)."""
        user = await self.get_by_id(user_id)
        if user is None:
            return None
        user.country = country.strip().upper()
        user.state_province = state_province.strip().upper()
        user.pin_code = pin_code.strip()
        user.house_number = house_number
        user.apartment_building = apartment_building
        await self._session.commit()
        await self._session.refresh(user)
        return user

    async def update_mobile_number(self, user_id: str, mobile_number: str) -> User | None:
        """Update the current user's mobile number after uniqueness validation
        (013-profile-popover-management, FR-008/FR-009).

        Raises `MobileNumberAlreadyRegisteredError` if another account already holds this
        number (looked up via the same blind-index hash used at registration).
        """
        user = await self.get_by_id(user_id)
        if user is None:
            return None
        existing = await self.get_by_mobile_number(mobile_number)
        if existing is not None and existing.id != user.id:
            raise MobileNumberAlreadyRegisteredError()
        user.mobile_number = encrypt_field(mobile_number.strip())
        user.mobile_number_lookup_hash = blind_index(mobile_number.strip())
        await self._session.commit()
        await self._session.refresh(user)
        return user

    async def mark_verified(self, user_id: str | uuid.UUID) -> User | None:
        """Set `is_verified = True` after successful OTP verification (FR-013)."""
        user = await self.get_by_id(user_id)
        if user is None:
            return None
        user.is_verified = True
        await self._session.commit()
        await self._session.refresh(user)
        return user

    async def set_recovery_lock(self, user_id: str | uuid.UUID, until: datetime) -> User | None:
        """Lock further recovery attempts until `until` after repeated failures (FR-016)."""
        user = await self.get_by_id(user_id)
        if user is None:
            return None
        user.recovery_locked_until = until
        await self._session.commit()
        await self._session.refresh(user)
        return user

    async def clear_recovery_lock(self, user_id: str | uuid.UUID) -> User | None:
        user = await self.get_by_id(user_id)
        if user is None:
            return None
        user.recovery_locked_until = None
        await self._session.commit()
        await self._session.refresh(user)
        return user

    async def update_password_hash(self, user_id: str | uuid.UUID, password_hash: str) -> User | None:
        """Persist a new password hash after a successful account-recovery reset (FR-015/016)."""
        user = await self.get_by_id(user_id)
        if user is None:
            return None
        user.password_hash = password_hash
        await self._session.commit()
        await self._session.refresh(user)
        return user

    async def update_academic_profile(
        self,
        user_id: str,
        board: str,
        standard: str,
        board_other: str | None,
    ) -> User | None:
        """Persist Board/Standard for first-login setup or a later edit (FR-006/FR-010).

        Used for both the initial save and subsequent edits - a single write path, per
        research.md's "API surface" decision.
        """
        user = await self.get_by_id(user_id)
        if user is None:
            return None
        user.board = board
        user.board_other = board_other
        user.standard = standard
        await self._session.commit()
        await self._session.refresh(user)
        return user
