import sys
from loguru import logger

# Remove default handler
logger.remove()

# Add standard error handler with custom format
logger.add(
    sys.stderr,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level="INFO"
)

# Optional: Add file handler
logger.add("logs/app.log", rotation="10 MB", retention="10 days", level="INFO")

def get_logger():
    return logger
