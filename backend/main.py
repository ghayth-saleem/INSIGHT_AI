"""
InsightAI FastAPI backend — entry point.
Loads all models once at startup, stores them in app.state.
"""

import sys
import os
from contextlib import asynccontextmanager

import joblib
import tensorflow as tf
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# so we can import from modules/ folder
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

# models folder path
MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")

# in-memory session store: session_id -> processed data dict
sessions = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load all models on startup, release on shutdown."""
    print("InsightAI: loading models...")

    try:
        app.state.iso_model = joblib.load(os.path.join(MODELS_DIR, "iso_forest.pkl"))
        print("  iso_forest.pkl loaded")
    except Exception as e:
        print(f"  WARNING: iso_forest.pkl failed: {e}")
        app.state.iso_model = None

    try:
        app.state.dnn_model = tf.keras.models.load_model(os.path.join(MODELS_DIR, "dnn_model.h5"), compile=False)
        print("  dnn_model.h5 loaded")
    except Exception as e:
        print(f"  WARNING: dnn_model.h5 failed: {e}")
        app.state.dnn_model = None

    try:
        app.state.scaler = joblib.load(os.path.join(MODELS_DIR, "scaler.pkl"))
        print("  scaler.pkl loaded")
    except Exception as e:
        print(f"  WARNING: scaler.pkl failed: {e}")
        app.state.scaler = None

    try:
        app.state.label_encoders = joblib.load(os.path.join(MODELS_DIR, "label_encoders.pkl"))
        print("  label_encoders.pkl loaded")
    except Exception as e:
        print(f"  WARNING: label_encoders.pkl failed: {e}")
        app.state.label_encoders = None

    try:
        app.state.account_stats = joblib.load(os.path.join(MODELS_DIR, "account_stats.pkl"))
        print("  account_stats.pkl loaded")
    except Exception as e:
        print(f"  WARNING: account_stats.pkl failed: {e}")
        app.state.account_stats = None

    try:
        app.state.benchmarks = joblib.load(os.path.join(MODELS_DIR, "benchmarks.pkl"))
        print("  benchmarks.pkl loaded")
    except Exception as e:
        print(f"  WARNING: benchmarks.pkl failed: {e}")
        app.state.benchmarks = None

    # load all 20 prophet models into a dict {1: model, 2: model, ...}
    app.state.prophet_models = {}
    for i in range(1, 21):
        try:
            path = os.path.join(MODELS_DIR, f"prophet_account_{i}.pkl")
            app.state.prophet_models[i] = joblib.load(path)
        except Exception as e:
            print(f"  WARNING: prophet_account_{i}.pkl failed: {e}")

    print(f"  prophet models loaded: {len(app.state.prophet_models)}/20")
    print("InsightAI: all models ready.")

    yield

    print("InsightAI: shutting down.")


app = FastAPI(title="InsightAI API", version="1.0.0", lifespan=lifespan)

# allow Next.js frontend on port 3000 to call this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# make sessions dict accessible to all routers via app.state
app.state.sessions = sessions

# register routers (empty for now, will be filled one by one)
from backend.routers import upload, analytics, insights, simulate, chatbot

app.include_router(upload.router,    prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(insights.router,  prefix="/api/v1")
app.include_router(simulate.router,  prefix="/api/v1")
app.include_router(chatbot.router,   prefix="/api/v1")


@app.get("/")
def root():
    return {"status": "InsightAI backend running"}
