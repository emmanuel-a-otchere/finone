from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import forecast_router, sentiment_router, optimize_router, health_router

app = FastAPI(
    title="SystemOne Intelligence",
    description="ML forecasting, NLP sentiment analysis, and optimization API",
    version="1.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(forecast_router)
app.include_router(sentiment_router)
app.include_router(optimize_router)


@app.get("/")
async def root():
    return {
        "service": "SystemOne Intelligence",
        "version": "1.1.0",
        "status": "operational",
    }
