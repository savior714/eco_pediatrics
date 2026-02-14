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

# Import routers
from routers import admissions, station, iv_records, vitals, exams, dev

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize Supabase and store in app.state
    await init_supabase()
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
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex="https?://.*", # Allow all http/https origins with credentials
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- WebSocket Endpoint ---
# Must be here or in a router. Let's keep it here or move to station if generic?
# The socket connects with {token}, which maps to station logic. 
# Re-using the logic from station router might be better, but the decorator needs 'app'.
# Actually, we can use router.websocket in station.py and include it.
# Let's check station.py again. I didn't add websocket endpoint there.
# I should add websocket endpoint to a router, but APIRouter support websockets.

from fastapi import WebSocket, WebSocketDisconnect

@app.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    logger.info(f"Connection attempt for token: {token}")
    await manager.connect(websocket, token)
    try:
        while True:
            await websocket.receive_text() # Keep connection alive, or handle client messages
    except WebSocketDisconnect:
        logger.info(f"Disconnected token: {token}")
        manager.disconnect(websocket, token)


# --- Include Routers ---
app.include_router(admissions.router, prefix="/api/v1/admissions", tags=["Admissions"])
app.include_router(station.router, prefix="/api/v1", tags=["Station"]) 
app.include_router(iv_records.router, prefix="/api/v1", tags=["IV Records"])
app.include_router(vitals.router, prefix="/api/v1/vitals", tags=["Vitals"])
app.include_router(exams.router, prefix="/api/v1", tags=["Exams"]) 
app.include_router(dev.router, prefix="/api/v1", tags=["Dev"])

# Additional include for upload which was in 'iv_records' router but path was /api/v1/upload/image
# In iv_records.py I defined @router.post("/upload/image"). 
# So if I include iv_records.router with prefix /api/v1/iv-records, it becomes /api/v1/iv-records/upload/image.
# BUT original was /api/v1/upload/image.
# I should fix the router or the prefix.
# Let's check iv_records.py again.

@app.get("/")
def read_root():
    return {"message": "PID Backend is running"}
