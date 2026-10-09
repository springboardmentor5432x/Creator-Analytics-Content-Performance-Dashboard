from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import UserRead, UserUpdate
from app.core.rbac import RoleChecker

router = APIRouter(prefix="/users", tags=["Admin User & RBAC Management"])

allow_admin = RoleChecker([UserRole.ADMINISTRATOR])

@router.get("", response_model=List[UserRead])
def list_all_users(
    current_user: User = Depends(allow_admin),
    db: Session = Depends(get_db)
):
    """Admin endpoint to list all registered system users and their assigned roles."""
    users = db.query(User).all()
    return users

@router.put("/{user_id}/role", response_model=UserRead)
def update_user_role(
    user_id: int,
    new_role: UserRole,
    current_user: User = Depends(allow_admin),
    db: Session = Depends(get_db)
):
    """Admin endpoint to update user assigned role (Role-Based Access Control)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    user.role = new_role
    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    current_user: User = Depends(allow_admin),
    db: Session = Depends(get_db)
):
    """Admin endpoint to remove a user account."""
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own admin account")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    db.delete(user)
    db.commit()
    return None
