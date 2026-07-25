from fastapi import APIRouter, Request, HTTPException

router = APIRouter()

FEATURE_LABELS = {
    'post_hour': 'Posting time',
    'follower_count': 'Account size',
    'caption_length': 'Caption length',
    'hashtags_count': 'Number of hashtags',
    'has_call_to_action': 'Call-to-action presence',
    'impressions_to_reach_ratio': 'Content virality ratio',
    'post_engagement_vs_account_avg': 'Performance vs account average',
}


def _compute_kpis(df_raw):
    """Compute all KPI values and health score from df_raw."""
    safe_reach = df_raw['reach'].replace(0, float('nan'))

    avg_er = float(df_raw['engagement_rate'].mean())

    if 'follower_count' in df_raw.columns and df_raw['follower_count'].max() > 0:
        avg_reach_rate = float((df_raw['reach'] / df_raw['follower_count'].replace(0, float('nan'))).mean())
    else:
        avg_reach_rate = 0.0

    avg_save_rate = float((df_raw['saves'] / safe_reach).mean()) if 'saves' in df_raw.columns else 0.0
    avg_share_rate = float((df_raw['shares'] / safe_reach).mean()) if 'shares' in df_raw.columns else 0.0
    avg_comment_rate = float((df_raw['comments'] / safe_reach).mean()) if 'comments' in df_raw.columns else 0.0
    avg_imp_ratio = float(df_raw['impressions_to_reach_ratio'].mean()) if 'impressions_to_reach_ratio' in df_raw.columns else 1.0

    # ER score (40%) -- 10% ER is treated as excellent ceiling
    er_score = min(100, int((avg_er / 0.10) * 100))

    # reach score (25%) -- 50% reach rate is treated as excellent ceiling
    reach_score = min(100, int((avg_reach_rate / 0.50) * 100))

    # consistency score (20%) -- based on posting interval regularity
    consistency_score = 50
    if 'post_datetime' in df_raw.columns and len(df_raw) > 2:
        dates = df_raw['post_datetime'].dropna().sort_values()
        gaps = dates.diff().dt.days.dropna()
        if len(gaps) > 1 and gaps.mean() > 0:
            cv = gaps.std() / gaps.mean()  # coefficient of variation
            consistency_score = min(100, max(0, int(100 - cv * 30)))

    # diversity score (15%) -- unique media types and content categories
    n_media = df_raw['media_type'].nunique() if 'media_type' in df_raw.columns else 1
    n_cats = df_raw['content_category'].nunique() if 'content_category' in df_raw.columns else 1
    diversity_score = min(100, int((n_media / 3) * 50 + (n_cats / 10) * 50))

    health_score = int(er_score * 0.40 + reach_score * 0.25 + consistency_score * 0.20 + diversity_score * 0.15)
    health_score = min(100, max(0, health_score))

    return {
        'engagement_rate': round(avg_er, 4),
        'reach_rate': round(avg_reach_rate, 4),
        'save_rate': round(avg_save_rate, 4),
        'share_rate': round(avg_share_rate, 4),
        'comment_rate': round(avg_comment_rate, 4),
        'impressions_to_reach_ratio': round(avg_imp_ratio, 4),
        'health_score': health_score,
        'health_breakdown': {
            'engagement_score': er_score,
            'reach_score': reach_score,
            'consistency_score': consistency_score,
            'diversity_score': diversity_score,
        }
    }


def _make_explanation(top_features, performance_label, anomaly_flag):
    """Generate a plain-text explanation from DNN feature attributions."""
    if not top_features:
        return f"This post was classified as {performance_label}."

    top = top_features[0]
    feat_label = FEATURE_LABELS.get(top['feature'], top['feature'])
    direction = "positively" if top['direction'] == 'positive' else "negatively"
    explanation = f"This post was classified as {performance_label}. {feat_label} was the primary factor and contributed {direction} to this result."

    if anomaly_flag and performance_label == 'Viral':
        explanation += " Flagged as an outlier -- significantly above normal performance."
    elif anomaly_flag and performance_label in ['Underperforming', 'Below Average']:
        explanation += " Flagged as an outlier -- significantly below normal performance."

    return explanation


@router.get("/kpis/{session_id}")
def get_kpis(session_id: str, request: Request):
    """Return computed KPIs for the uploaded account."""
    session = request.app.state.sessions.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    return _compute_kpis(session['df_raw'])


@router.get("/benchmarks/{content_category}")
def get_benchmarks(content_category: str, request: Request):
    """Return industry benchmark averages for a given content category."""
    benchmarks = request.app.state.benchmarks
    if benchmarks is None:
        raise HTTPException(status_code=503, detail="Benchmarks not loaded.")

    data = benchmarks.get(content_category)
    if data is None:
        for key in benchmarks:
            if key.lower() == content_category.lower():
                data = benchmarks[key]
                break

    if data is None:
        raise HTTPException(status_code=404, detail=f"Category '{content_category}' not found.")

    return {
        'category': content_category,
        'avg_engagement_rate': data.get('avg_er', 0.0),
        'avg_reach_rate': data.get('avg_reach_rate', 0.0),
        'avg_save_rate': data.get('avg_save_rate', 0.0),
        'sample_size': data.get('n', 0),
    }


@router.get("/anomalies/{session_id}")
def get_anomalies(session_id: str, request: Request):
    """Return per-post anomaly detection results with feature explanations."""
    session = request.app.state.sessions.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")

    anomaly_results = session['anomaly_results']
    dnn_results = session['dnn_results']
    df_raw = session['df_raw'].reset_index(drop=True)

    n = min(len(anomaly_results), len(dnn_results), len(df_raw))
    posts = []

    for i in range(n):
        row = df_raw.iloc[i]
        anomaly = anomaly_results[i]
        dnn = dnn_results[i]

        top_features = dnn.get('top_contributing_features', [])
        perf_label = anomaly['performance_label']

        post_date = ''
        if 'post_datetime' in df_raw.columns:
            dt = row.get('post_datetime')
            if dt is not None and str(dt) != 'NaT':
                post_date = str(dt)[:10]

        posts.append({
            'post_id': f"post_{i + 1}",
            'date': post_date,
            'media_type': str(row.get('media_type', 'unknown')),
            'performance_level': anomaly['performance_level'],
            'performance_label': perf_label,
            'anomaly_flag': anomaly['anomaly_flag'],
            'predicted_er': dnn.get('predicted_er', 0.042),
            'shap_explanation': _make_explanation(top_features, perf_label, anomaly['anomaly_flag']),
            'top_shap_features': top_features,
        })

    return {'posts': posts}
