from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
import os
from contextlib import asynccontextmanager

from database import init_supabase
from websocket_manager import manager
from logger import logger
from utils import execute_with_retry_async

# Import routers
from routers import admissions, station, iv_records, vitals, exams, dev, meals

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize Supabase and store in app.state
    if not hasattr(app.state, "supabase") or not app.state.supabase:
        app.state.supabase = await init_supabase()
        logger.info("Supabase AsyncClient initialized and stored in app.state")
    yield
    # Cleanup: Close connections to prevent resource leaks
    if app.state.supabase:
        try:
            # Supabase-py uses internal httpx clients. Closing them explicitly if possible.
            if hasattr(app.state.supabase.auth, "aclose"): # Some versions
                await app.state.supabase.auth.aclose()
            elif hasattr(app.state.supabase.auth, "_client") and hasattr(app.state.supabase.auth._client, "aclose"):
                await app.state.supabase.auth._client.aclose()
            
            if hasattr(app.state.supabase.postgrest, "aclose"):
                await app.state.supabase.postgrest.aclose()
                
            logger.info("Supabase AsyncClient connections closed.")
        except Exception as e:
            logger.warning(f"Error during client cleanup: {e}")

app = FastAPI(lifespan=lifespan)

# --- Global Exception Handlers ---

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    logger.error(f"HTTP error {exc.status_code}: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation error: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.critical(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"},
    )

# Mount Static Files
os.makedirs("uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="uploads"), name="static")

# CORS Configuration
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import WebSocket, WebSocketDisconnect




# --- Include Routers ---
app.include_router(admissions.router, prefix="/api/v1/admissions", tags=["Admissions"])
app.include_router(station.router, prefix="/api/v1", tags=["Station"]) 
app.include_router(iv_records.router, prefix="/api/v1", tags=["IV Records"])
app.include_router(vitals.router, prefix="/api/v1/vitals", tags=["Vitals"])
app.include_router(exams.router, prefix="/api/v1", tags=["Exams"]) 
app.include_router(meals.router, prefix="/api/v1/meals", tags=["Meals"])


# Conditionally include dev router (Operation Safety)
ENABLE_DEV = os.getenv("ENABLE_DEV_ROUTES", "false").lower() == "true"
ENV = os.getenv("ENV", "production")

if ENABLE_DEV and ENV in ["local", "staging"]:
    app.include_router(dev.router, prefix="/api/v1/dev", tags=["Dev"])
    logger.info(f"Dev router mounted (ENABLE_DEV_ROUTES=true, ENV={ENV})")
else:
    logger.info(f"Dev router disabled (ENABLE_DEV_ROUTES={ENABLE_DEV}, ENV={ENV})")

# WS Token Validation
async def verify_ws_token(token: str):
    # 1. Check for Station Auth via Env Variable
    # Default to 'STATION' if not set, following the .env.example guidance
    station_token = os.getenv("STATION_WS_TOKEN", "STATION")
    if token == station_token:
        return True
        
    # 2. Check for Patient Auth (Admission Token) - Must be a valid UUID string
    import uuid
    try:
        uuid.UUID(token)
    except ValueError:
        # Not a UUID, and didn't match station_token, so reject early to avoid DB error 22P02
        return False

    if not hasattr(app.state, "supabase") or not app.state.supabase:
        return False # DB not ready
        
    try:
        # Enforce status == 'IN_PROGRESS' or 'OBSERVATION'
        res = await app.state.supabase.table("admissions") \
            .select("id") \
            .eq("access_token", token) \
            .in_("status", ["IN_PROGRESS", "OBSERVATION"]) \
            .execute()
            
        if res.data:
            return True
    except Exception as e:
        logger.error(f"WS Token Validation Error: {e}")
    
    return False

@app.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    # Validate Token
    is_valid = await verify_ws_token(token)
    if not is_valid:
        logger.warning(f"Connection rejected for invalid or inactive token: {token}")
        await websocket.close(code=4003) # Forbidden
        return

    logger.info(f"WebSocket connected for token: {token}")
    await manager.connect(websocket, token)
    try:
        while True:
            await websocket.receive_text() # Keep connection alive
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for token: {token}")
        manager.disconnect(websocket, token)


@app.get("/health")
async def health_check():
    """Health check endpoint to verify DB connection"""
    if not hasattr(app.state, "supabase") or not app.state.supabase:
        return JSONResponse(status_code=503, content={"status": "unavailable", "detail": "Database not initialized"})
    
    try:
        # Lightweight query to verify connection
        await execute_with_retry_async(app.state.supabase.table("admissions").select("id", count="exact").limit(1))
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(status_code=503, content={"status": "unhealthy", "detail": str(e)})

@app.get("/")
def read_root():
    return {"message": "PID Backend is running"}
