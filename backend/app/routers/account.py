from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import User
from ..roles import ADMIN
from ..schemas import AccountUpdate, DeactivateRequest, PasswordChange, UserOut
from ..security import hash_password, verify_password
from .auth import to_user_out

router = APIRouter(prefix="/api/account", tags=["Account settings"])


@router.patch("/me", response_model=UserOut)
def update_account(data: AccountUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Change the display name of your own account."""
    user.name = data.name
    db.commit()
    db.refresh(user)
    return to_user_out(user)


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    data: PasswordChange, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Sensitive action: the current password must be confirmed."""
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    if verify_password(data.new_password, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="New password must be different from the current one")
    user.password_hash = hash_password(data.new_password)
    db.commit()


@router.post("/deactivate", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_account(
    data: DeactivateRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Sensitive action: disables your own account after confirming the password."""
    if user.role == ADMIN:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Administrators cannot deactivate their own account")
    if not verify_password(data.password, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Password is incorrect")
    user.is_active = False
    db.commit()
