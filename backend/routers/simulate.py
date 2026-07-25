from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import sys, os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
from modules.dnn_mod import predict_engagement

router = APIRouter()


class SimulateRequest(BaseModel):
    """Input for What-If Post Simulator."""
    media_type: str = "reel"
    content_category: str = "Beauty"
    traffic_source: str = "Home Feed"
    day_of_week: str = "Friday"
    account_type: str = "brand"
    post_hour: int = 12
    follower_count: int = 5000
    caption_length: int = 100
    hashtags_count: int = 5
    has_call_to_action: int = 0
    impressions_to_reach_ratio: float = 1.2
    account_avg_er: float = 0.042


@router.post("/simulate")
def simulate_post(body: SimulateRequest, request: Request):
    """What-If Post Simulator -- predict ER for a hypothetical post config."""

    # Build post_config dict matching what dnn_mod expects
    post_config = {
        "media_type": body.media_type,
        "content_category": body.content_category,
        "traffic_source": body.traffic_source,
        "day_of_week": body.day_of_week,
        "account_type": body.account_type,
        "account_id": 1,  # default -- user is not in training set
        "post_hour": body.post_hour,
        "follower_count": body.follower_count,
        "caption_length": body.caption_length,
        "hashtags_count": body.hashtags_count,
        "has_call_to_action": body.has_call_to_action,
        "impressions_to_reach_ratio": body.impressions_to_reach_ratio,
    }

    # Get pre-loaded models from app.state
    dnn_model = getattr(request.app.state, 'dnn_model', None)
    scaler = getattr(request.app.state, 'scaler', None)
    label_encoders = getattr(request.app.state, 'label_encoders', None)
    account_stats = getattr(request.app.state, 'account_stats', None)

    if dnn_model is None:
        raise HTTPException(status_code=503, detail="DNN model not loaded")

    # Run DNN prediction
    result = predict_engagement(
        post_config,
        model=dnn_model,
        scaler=scaler,
        label_encoders=label_encoders,
        account_stats=account_stats
    )

    predicted_er = result['predicted_er']

    # Confidence interval -- simple +/- 15% band (synthetic data limitation)
    margin = round(predicted_er * 0.15, 4)
    confidence_interval = {
        "lower": round(max(0.0, predicted_er - margin), 4),
        "upper": round(predicted_er + margin, 4)
    }

    # Plain explanation using account_avg_er for comparison
    avg_er = body.account_avg_er
    if avg_er > 0:
        pct_diff = ((predicted_er - avg_er) / avg_er) * 100
        direction = "above" if pct_diff >= 0 else "below"
        explanation = (
            f"Posting a {body.media_type} at {body.post_hour}:00 on {body.day_of_week} "
            f"is expected to generate {predicted_er*100:.1f}% engagement -- "
            f"{abs(pct_diff):.0f}% {direction} your account average of {avg_er*100:.1f}%."
        )
    else:
        explanation = (
            f"Posting a {body.media_type} at {body.post_hour}:00 on {body.day_of_week} "
            f"is expected to generate {predicted_er*100:.1f}% engagement."
        )

    return {
        "predicted_engagement_rate": predicted_er,
        "confidence_interval": confidence_interval,
        "performance_bucket": result['performance_bucket'],
        "top_contributing_features": result['top_contributing_features'],
        "plain_explanation": explanation
    }
