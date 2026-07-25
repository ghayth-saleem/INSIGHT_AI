import uuid
import tempfile
import os
import shutil

from fastapi import APIRouter, UploadFile, File, Request, HTTPException

from modules.processor import load_and_process, ARABIC_TO_ENGLISH
from modules.anomaly_mod import run_anomaly_detection
from modules.dnn_mod import predict_engagement
from modules.prophet_mod import run_prophet_analysis
from modules.arabert_mod import run_sentiment_analysis

router = APIRouter()


def _build_post_config(row):
    """Build a single post_config dict from a df_dnn row."""
    return {
        'media_type': str(row.get('media_type', 'reel')),
        'content_category': str(row.get('content_category', 'Beauty')),
        'traffic_source': str(row.get('traffic_source', 'Home Feed')),
        'day_of_week': str(row.get('day_of_week', 'Monday')),
        'account_type': str(row.get('account_type', 'brand')),
        'account_id': row.get('account_id', 1),
        'post_hour': float(row.get('post_hour', 12)),
        'follower_count': float(row.get('follower_count', 5000)),
        'caption_length': float(row.get('caption_length', 100)),
        'hashtags_count': float(row.get('hashtags_count', 5)),
        'has_call_to_action': float(row.get('has_call_to_action', 0)),
        'impressions_to_reach_ratio': float(row.get('impressions_to_reach_ratio', 1.2)),
    }


def _run_dnn_bulk(df_dnn, model, scaler, label_encoders, account_stats):
    """Loop through df_dnn and run DNN prediction on each post."""
    results = []
    for _, row in df_dnn.iterrows():
        post_config = _build_post_config(row)
        result = predict_engagement(
            post_config,
            model=model,
            scaler=scaler,
            label_encoders=label_encoders,
            account_stats=account_stats,
        )
        results.append(result)
    print(f"DNN bulk inference done: {len(results)} posts")
    return results


@router.post("/upload")
async def upload_file(request: Request, file: UploadFile = File(...)):
    """Accept Meta CSV, run all ML modules, store results in session."""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    tmp_path = None
    try:
        # save upload to a temp file on disk so processor can read it
        with tempfile.NamedTemporaryFile(delete=False, suffix='.csv') as tmp:
            tmp_path = tmp.name
            shutil.copyfileobj(file.file, tmp)
        print(f"Saved upload to temp: {tmp_path}")

        account_stats = request.app.state.account_stats

        # Step 1: process the CSV
        df_iso, df_dnn, df_prophet, df_raw, meta = load_and_process(
            tmp_path, mode="auto", account_stats=account_stats
        )

        # Step 2: anomaly detection (Isolation Forest)
        anomaly_results = run_anomaly_detection(
            df_iso, iso_model=request.app.state.iso_model
        )

        # Step 3: DNN bulk predictions (one per post, for /anomalies and /analytics)
        dnn_results = _run_dnn_bulk(
            df_dnn,
            model=request.app.state.dnn_model,
            scaler=request.app.state.scaler,
            label_encoders=request.app.state.label_encoders,
            account_stats=account_stats,
        )

        # Step 4: Prophet trend analysis
        prophet_results = run_prophet_analysis(
            df_prophet, df_raw,
            account_stats=account_stats,
            models_dir='models'
        )

        # Step 5: AraBERT sentiment analysis (only if captions exist)
        arabert_results = None
        if meta['captions_detected']:
            print("Captions detected — running AraBERT sentiment analysis...")
            arabert_results = run_sentiment_analysis(df_raw)
            print(f"AraBERT done: available={arabert_results.get('available')}")

        # store everything in session — other endpoints will read from here
        session_id = str(uuid.uuid4())
        request.app.state.sessions[session_id] = {
            'meta': meta,
            'df_raw': df_raw,
            'df_dnn': df_dnn,
            'anomaly_results': anomaly_results,
            'dnn_results': dnn_results,
            'prophet_results': prophet_results,
            'arabert_results': arabert_results,
        }
        print(f"Session stored: {session_id}")

        # processor returns Arabic column names that were mapped — convert to English
        columns_mapped = [
            ARABIC_TO_ENGLISH.get(c, c) for c in meta['columns_mapped']
        ]

        return {
            'session_id': session_id,
            'account_name': meta['account_name'],
            'total_posts': meta['total_posts'],
            'date_range': meta['date_range'],
            'captions_detected': meta['captions_detected'],
            'columns_mapped': columns_mapped,
        }

    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        print(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")
    finally:
        # always delete the temp file, even if something crashed
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)
            print(f"Temp file deleted: {tmp_path}")
