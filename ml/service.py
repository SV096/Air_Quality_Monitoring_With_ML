# ml/service.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error
import uvicorn
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AQI Forecast service", version="1.0.0")

class Point(BaseModel):
    ts: str
    y: float

class ForecastRequest(BaseModel):
    city: Optional[str] = None
    series: List[Point]
    horizon: int = 24
    window: int = 24  # lookback window size

class ForecastResponse(BaseModel):
    forecast: List[float]
    ci: dict
    horizon: int
    model: Optional[str] = "rfr_window"

def make_dataset(values, window):
    """Create sliding window dataset for training"""
    X = []
    y = []
    for i in range(len(values) - window):
        X.append(values[i:i+window])
        y.append(values[i+window])
    return np.array(X), np.array(y)

@app.post("/forecast", response_model=ForecastResponse)
def forecast(req: ForecastRequest):
    try:
        # Validate input
        if not req.series or len(req.series) < req.window + 1:
            raise HTTPException(status_code=400, detail="Need at least window+1 points in series")

        # Convert to numeric series
        vals = np.array([float(p.y) for p in req.series if p.y is not None])
        
        if len(vals) < req.window + 1:
            raise HTTPException(status_code=400, detail="Not enough valid data points")
            
        window = int(req.window)
        horizon = int(req.horizon)

        # Build sliding-window dataset
        X, y = make_dataset(vals, window)
        if len(X) < 5:
            # Fallback: simple persistence forecast
            last = float(vals[-1])
            forecast = [last for _ in range(horizon)]
            return ForecastResponse(forecast=forecast, ci={"lower":[last]*horizon, "upper":[last]*horizon}, horizon=horizon)

        # Train-test split for residual estimation
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        model = RandomForestRegressor(n_estimators=200, random_state=42)
        model.fit(X_train, y_train)

        # Compute residuals on test set
        y_pred_test = model.predict(X_test)
        residuals = y_test - y_pred_test
        resid_std = float(np.std(residuals)) if residuals.size > 0 else 0.0

        # Iterative forecasting: seed with last window
        seed = list(vals[-window:])
        preds = []
        for i in range(horizon):
            x_in = np.array(seed[-window:]).reshape(1, -1)
            p = float(model.predict(x_in)[0])
            preds.append(p)
            seed.append(p)  # append to feed next step

        lower = [float(max(0, p - 1.96*resid_std)) for p in preds]  # Ensure non-negative
        upper = [float(p + 1.96*resid_std) for p in preds]

        return ForecastResponse(forecast=preds, ci={"lower": lower, "upper": upper}, horizon=horizon)
        
    except Exception as e:
        logger.error(f"Forecast error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Forecast failed: {str(e)}")

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "AQI Forecast Service"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)