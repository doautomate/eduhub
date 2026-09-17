from fastapi import FastAPI

from src.api.v1.api import api_router
from src.api.v1.endpoints.health import router as health_router
from src.middleware.security_headers import SecurityHeadersMiddleware

app = FastAPI(title="FastAPI App")
app.add_middleware(SecurityHeadersMiddleware)
app.include_router(health_router)
app.include_router(api_router, prefix="/api/v1")
