# ML Service for Job Scam Detection

This directory contains the Python-based machine learning service for advanced job scam detection.

## Architecture

```
ml-service/
├── models/              # Trained model files
│   ├── distilbert/     # Fine-tuned transformer model
│   ├── xgboost/        # Gradient boosting model
│   └── isolation/      # Anomaly detection model
├── src/
│   ├── api.py          # FastAPI endpoints
│   ├── ensemble.py     # Ensemble fusion logic
│   ├── features.py     # Feature processing
│   ├── train.py        # Training scripts
│   └── inference.py    # Prediction logic
├── data/               # Training data (gitignored)
├── requirements.txt    # Python dependencies
└── modal_deploy.py     # Modal.com deployment script
```

## Setup

### Local Development

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run local server
uvicorn src.api:app --reload --port 8000
```

### Modal Deployment

```bash
# Install Modal
pip install modal

# Deploy to Modal (serverless GPU)
modal deploy modal_deploy.py
```

## API Endpoints

### POST /predict
Predict scam probability for a job posting.

**Request:**
```json
{
  "features": {
    "textFeatures": {...},
    "qualityFeatures": {...},
    "contentFeatures": {...},
    "redFlagFeatures": {...}
  },
  "jobContent": "string"
}
```

**Response:**
```json
{
  "scamProbability": 0.85,
  "ghostProbability": 0.45,
  "confidence": 0.92,
  "modelScores": {
    "transformer": 0.88,
    "xgboost": 0.82,
    "anomaly": 0.75
  },
  "featureImportance": [...]
}
```

## Training

### Initial Training

```bash
# Train DistilBERT (requires GPU)
python src/train.py --model distilbert --data data/training.json

# Train XGBoost
python src/train.py --model xgboost --data data/training.json

# Train Isolation Forest
python src/train.py --model isolation --data data/training.json
```

### Retraining

```bash
# Weekly retraining (automated via cron)
python src/train.py --retrain --incremental
```

## Model Versions

Track model versions in `models/versions.json`:
```json
{
  "v1.0.0": {
    "distilbert": "distilbert-scam-v1",
    "xgboost": "xgb-scam-v1",
    "deployedAt": "2025-01-15T00:00:00Z",
    "accuracy": 0.87
  }
}
```

## Dependencies

- **transformers**: Hugging Face transformers for DistilBERT
- **xgboost**: Gradient boosting
- **scikit-learn**: Isolation Forest, metrics
- **fastapi**: API framework
- **modal**: Serverless deployment
- **torch**: PyTorch for neural networks

## Environment Variables

```bash
OPENAI_API_KEY=sk-...        # For GPT-4o ensemble
CONVEX_URL=https://...       # For fetching training data
MODEL_VERSION=v1.0.0         # Current model version
```

## Testing

```bash
# Run tests
pytest tests/

# Test specific model
pytest tests/test_transformer.py
```

## Monitoring

View metrics at: `http://localhost:8000/metrics`

Metrics include:
- Predictions per second
- Average inference time
- Model accuracy (from validation set)
- Error rates
