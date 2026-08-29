from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr
from jose import jwt, JWTError
from app.core.config import settings
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.user import User

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: str = "student"

class UserPasswordUpdate(BaseModel):
    old_password: str
    new_password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    email: str

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await User.find_one(User.email == email)
    if user is None:
        raise credentials_exception
    return user

async def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges"
        )
    return current_user

@router.post("/register", response_model=dict)
async def register(user_in: UserCreate):
    user = await User.find_one(User.email == user_in.email)
    if user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # For a real app, registration of admins should be secured. We will allow it for workshop setup.
    hashed_password = get_password_hash(user_in.password)
    new_user = User(email=user_in.email, password_hash=hashed_password, role=user_in.role)
    await new_user.insert()
    return {"message": "User created successfully"}

@router.post("/admin/users", response_model=dict)
async def create_users_bulk(users_in: list[UserCreate], admin=Depends(get_current_admin)):
    created = 0
    errors = []
    for u in users_in:
        existing = await User.find_one(User.email == u.email)
        if existing:
            errors.append(f"{u.email} already exists")
            continue
        hashed_password = get_password_hash(u.password)
        new_user = User(email=u.email, password_hash=hashed_password, role="student")
        await new_user.insert()
        created += 1
    
    return {"message": f"Created {created} users", "errors": errors}

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    if form_data.username == "guest@uni.edu":
        guest = await User.find_one(User.email == "guest@uni.edu")
        if not guest:
            guest_hash = get_password_hash("guestpassword")
            new_guest = User(email="guest@uni.edu", password_hash=guest_hash, role="student")
            await new_guest.insert()

    user = await User.find_one(User.email == form_data.username)
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(subject=user.email)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "email": user.email
    }

@router.get("/me", response_model=dict)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return {"email": current_user.email, "role": current_user.role}

@router.put("/password", response_model=dict)
async def change_password(passwords: UserPasswordUpdate, current_user: User = Depends(get_current_user)):
    if current_user.email == "guest@uni.edu":
        raise HTTPException(status_code=400, detail="Cannot change guest account password")
        
    if not verify_password(passwords.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect current password")
        
    new_hash = get_password_hash(passwords.new_password)
    current_user.password_hash = new_hash
    await current_user.save()
    return {"message": "Password updated successfully"}
