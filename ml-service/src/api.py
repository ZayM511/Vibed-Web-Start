"""
FastAPI ML Service for Job Scam Detection
Serves the ensemble of ML models for real-time predictions
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import logging
import time
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Job Scam Detection ML Service",
    description="Advanced ML-powered job scam and ghost job detection",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request/response
class Features(BaseModel):
    textFeatures: Dict[str, Any]
    qualityFeatures: Dict[str, Any]
    contentFeatures: Dict[str, Any]
    redFlagFeatures: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = None

class PredictionRequest(BaseModel):
    features: Features
    jobContent: Optional[str] = None

class ModelScore(BaseModel):
    transformer: float
    xgboost: float
    anomaly: float
    llm: Optional[float] = None

class FeatureImportance(BaseModel):
    feature: str
    importance: float

class PredictionResponse(BaseModel):
    scamProbability: float
    ghostProbability: float
    confidence: float
    modelScores: ModelScore
    featureImportance: List[FeatureImportance]
    inferenceTime: float  # milliseconds
    modelVersion: str

# Global model instances (loaded on startup)
models = {
    "transformer": None,
    "xgboost": None,
    "isolation": None,
}

# Model version
MODEL_VERSION = "v1.0.0-dev"

@app.on_event("startup")
async def load_models():
    """Load all ML models on startup"""
    logger.info("Loading ML models...")

    try:
        # TODO: Load actual models
        # For now, we'll use placeholders
        logger.info(f"Models loaded successfully (version: {MODEL_VERSION})")

        # In production:
        # from .inference import load_transformer, load_xgboost, load_isolation
        # models["transformer"] = load_transformer()
        # models["xgboost"] = load_xgboost()
        # models["isolation"] = load_isolation()

    except Exception as e:
        logger.error(f"Failed to load models: {e}")
        raise

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "Job Scam Detection ML Service",
        "status": "healthy",
        "version": MODEL_VERSION,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "models_loaded": all(model is not None for model in models.values()),
        "model_version": MODEL_VERSION
    }

@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """
    Main prediction endpoint
    Takes extracted features and returns scam probability
    """
    start_time = time.time()

    try:
        # Extract features from request
        features = request.features

        # TODO: Run ensemble prediction
        # For now, return mock predictions based on red flags

        # Simple heuristic for development
        red_flags = features.redFlagFeatures

        # Count severe red flags
        severe_red_flags = sum([
            red_flags.get("requestsPayment", False),
            red_flags.get("requestsSSN", False),
            red_flags.get("requestsBankInfo", False),
            red_flags.get("guaranteesIncome", False),
            red_flags.get("tooGoodToBeTrue", False),
        ])

        # Count moderate red flags
        moderate_red_flags = sum([
            red_flags.get("hasTrainingFee", False),
            red_flags.get("usesGenericEmail", False) if features.contentFeatures.get("usesGenericEmail") else False,
            red_flags.get("urgencyKeywords", 0) > 2,
            red_flags.get("pressureKeywords", 0) > 1,
            red_flags.get("requestsOffPlatform", False),
        ])

        # Quality score (lower = more suspicious)
        quality_score = features.qualityFeatures.get("grammarQualityScore", 50)
        readability = features.qualityFeatures.get("readabilityScore", 50)

        # Calculate scam probability (0-1)
        base_scam_prob = min(
            (severe_red_flags * 0.25) + (moderate_red_flags * 0.10),
            0.95
        )

        # Adjust for quality
        if quality_score < 60:
            base_scam_prob = min(base_scam_prob + 0.15, 0.98)

        # Calculate ghost job probability
        vague_desc = not features.qualityFeatures.get("hasClearResponsibilities", True)
        too_many_reqs = features.textFeatures.get("sentenceCount", 0) > 50

        ghost_prob = 0.0
        if vague_desc:
            ghost_prob += 0.25
        if too_many_reqs:
            ghost_prob += 0.20
        if not features.contentFeatures.get("mentionsSalary", False):
            ghost_prob += 0.15

        ghost_prob = min(ghost_prob, 0.85)

        # Mock model scores (in production, these come from actual models)
        model_scores = ModelScore(
            transformer=base_scam_prob + 0.05,
            xgboost=base_scam_prob - 0.03,
            anomaly=base_scam_prob + 0.02,
            llm=None  # LLM called separately
        )

        # Ensemble fusion (weighted average)
        scam_probability = (
            model_scores.transformer * 0.40 +
            model_scores.xgboost * 0.30 +
            model_scores.anomaly * 0.10 +
            base_scam_prob * 0.20  # Placeholder for LLM
        )

        # Confidence based on model agreement
        model_variance = abs(model_scores.transformer - model_scores.xgboost)
        confidence = max(0.5, 1.0 - model_variance * 2)

        # Mock feature importance
        feature_importance = [
            FeatureImportance(feature="requestsPayment", importance=0.25),
            FeatureImportance(feature="guaranteesIncome", importance=0.20),
            FeatureImportance(feature="usesGenericEmail", importance=0.15),
            FeatureImportance(feature="urgencyKeywords", importance=0.12),
            FeatureImportance(feature="grammarQualityScore", importance=0.10),
        ]

        inference_time = (time.time() - start_time) * 1000  # Convert to ms

        logger.info(f"Prediction completed in {inference_time:.2f}ms - Scam: {scam_probability:.2f}, Confidence: {confidence:.2f}")

        return PredictionResponse(
            scamProbability=round(scam_probability, 3),
            ghostProbability=round(ghost_prob, 3),
            confidence=round(confidence, 3),
            modelScores=model_scores,
            featureImportance=feature_importance,
            inferenceTime=round(inference_time, 2),
            modelVersion=MODEL_VERSION
        )

    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/metrics")
async def metrics():
    """Prometheus-style metrics endpoint"""
    # TODO: Implement actual metrics collection
    return {
        "predictions_total": 0,
        "predictions_per_second": 0.0,
        "avg_inference_time_ms": 0.0,
        "model_version": MODEL_VERSION,
        "uptime_seconds": 0
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
