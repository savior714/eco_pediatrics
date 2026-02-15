from fastapi import Request, HTTPException
from supabase._async.client import AsyncClient

# --- Dependency ---
async def get_supabase(request: Request) -> AsyncClient:
    """
    Dependency to provide the Supabase client from app.state
    """
    client = getattr(request.app.state, "supabase", None)
    if not client:
        # Fallback for safety during initialization or edge cases
        # Import inside function to avoid circular imports if database imports this (which it shouldn't, but safety first)
        from database import supabase as global_supabase
        client = global_supabase
    
    if not client:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")
    return client

async def verify_admission_token(request: Request) -> str:
    """
    Extracts and validates X-Admission-Token from header.
    Returns the token if present, otherwise raises 401.
    """
    token = request.headers.get("X-Admission-Token")
    if not token:
        raise HTTPException(status_code=401, detail="X-Admission-Token header missing")
    return token
