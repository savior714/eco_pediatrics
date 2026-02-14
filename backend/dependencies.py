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
