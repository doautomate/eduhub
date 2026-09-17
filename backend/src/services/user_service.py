"""Authenticated user profile lookups (backs GET/PATCH /api/v1/users/me and friends)."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import StateProvinceMismatchError, UserNotFoundError
from src.models.audit import AuditEventType
from src.models.user import User
from src.repositories.audit_event_repository import AuditEventRepository
from src.repositories.user_repository import UserRepository
from src.services.location_service import LocationService
from src.tasks.email_tasks import dispatch_profile_change_email


class UserService:
    def __init__(self, session: AsyncSession) -> None:
        self._repo = UserRepository(session)
        self._audit_repo = AuditEventRepository(session)
        self._location_service = LocationService()

    async def get_profile(self, user_id: str) -> User:
        """Fetch the current user's profile by id (the JWT `sub` claim).

        Profile fields (first_name/last_name/mobile_number) are never embedded in the
        JWT itself (FR-011) - this is the sanctioned authenticated retrieval path.
        """
        user = await self._repo.get_by_id(user_id)
        if user is None:
            raise UserNotFoundError(user_id)
        return user

    async def update_address(
        self,
        user_id: str,
        country: str,
        state_province: str,
        pin_code: str,
        house_number: str | None = None,
        apartment_building: str | None = None,
    ) -> User:
        """Update the current user's address (User Story 5, FR-018/FR-019; extended by
        013-profile-popover-management FR-011 with two new optional fields).

        Every changed field records one `AuditEvent` row (FR-021) and, if any field
        changed, one best-effort security-notification email is sent (FR-022). Both are
        non-blocking relative to the 200 response (Edge Cases: notification failure must
        not roll back or block an already-successful save).
        """
        if not self._location_service.is_valid_state_for_country(country, state_province):
            raise StateProvinceMismatchError(country, state_province)

        previous = await self._repo.get_by_id(user_id)
        if previous is None:
            raise UserNotFoundError(user_id)

        before = {
            "country": previous.country,
            "state_province": previous.state_province,
            "pin_code": previous.pin_code,
            "house_number": previous.house_number,
            "apartment_building": previous.apartment_building,
        }

        user = await self._repo.update_address(
            user_id,
            country=country,
            state_province=state_province,
            pin_code=pin_code,
            house_number=house_number,
            apartment_building=apartment_building,
        )
        if user is None:
            raise UserNotFoundError(user_id)

        after = {
            "country": user.country,
            "state_province": user.state_province,
            "pin_code": user.pin_code,
            "house_number": user.house_number,
            "apartment_building": user.apartment_building,
        }
        changed_fields = [field for field, old in before.items() if after[field] != old]
        for field in changed_fields:
            await self._audit_repo.record_change(
                user_id=user_id,
                event_type=AuditEventType.PROFILE_ADDRESS_CHANGED,
                field=field,
                old_value=before[field],
                new_value=after[field],
            )
        if changed_fields:
            dispatch_profile_change_email(user.email, changed_section="address")
        return user

    async def update_personal_details(self, user_id: str, mobile_number: str) -> User:
        """Update the current user's mobile number (013-profile-popover-management,
        FR-008/FR-009). Takes effect immediately, no OTP step (FR-018).

        Records one `AuditEvent` row storing the same Fernet-encrypted representation for
        old/new values (data-model.md: mobile_number is encrypted at rest, so its audit
        history MUST NOT store a second plaintext copy) and sends one best-effort
        security-notification email (FR-022).
        """
        previous = await self._repo.get_by_id(user_id)
        if previous is None:
            raise UserNotFoundError(user_id)
        old_encrypted_value = previous.mobile_number

        user = await self._repo.update_mobile_number(user_id, mobile_number)
        if user is None:
            raise UserNotFoundError(user_id)

        if user.mobile_number != old_encrypted_value:
            await self._audit_repo.record_change(
                user_id=user_id,
                event_type=AuditEventType.PROFILE_MOBILE_NUMBER_CHANGED,
                field="mobile_number",
                old_value=old_encrypted_value,
                new_value=user.mobile_number,
            )
            dispatch_profile_change_email(user.email, changed_section="mobile number")
        return user

    async def update_academic_profile(
        self,
        user_id: str,
        board: str,
        standard: str,
        board_other: str | None,
    ) -> User:
        """Save Board/Standard for first-login setup (US1) or a later edit (US3).

        Field-level validation (both required together, "Other" free-text rule) is
        already enforced by `UpdateAcademicProfileRequest` at the API boundary (FR-003,
        FR-005a) - this method's only remaining responsibility is persistence.

        Records one `AuditEvent` row per changed field (FR-021). No notification email is
        sent for academic changes - FR-022 scopes the security-notification email to
        mobile-number/address changes only.
        """
        previous = await self._repo.get_by_id(user_id)
        if previous is None:
            raise UserNotFoundError(user_id)
        before = {
            "board": previous.board,
            "board_other": previous.board_other,
            "standard": previous.standard,
        }

        user = await self._repo.update_academic_profile(
            user_id, board=board, standard=standard, board_other=board_other
        )
        if user is None:
            raise UserNotFoundError(user_id)

        after = {
            "board": user.board,
            "board_other": user.board_other,
            "standard": user.standard,
        }
        for field, old in before.items():
            if after[field] != old:
                await self._audit_repo.record_change(
                    user_id=user_id,
                    event_type=AuditEventType.PROFILE_ACADEMIC_PROFILE_CHANGED,
                    field=field,
                    old_value=old,
                    new_value=after[field],
                )
        return user
