import joblib
import pandas as pd
import numpy as np

# exact order must match training
IF_FEATURES = [
    'engagement_rate',
    'reach',
    'impressions',
    'saves',
    'followers_gained',
    'impressions_to_reach_ratio'
]

LEVEL_LABELS = {
    1: 'Underperforming',
    2: 'Below Average',
    3: 'Average',
    4: 'High',
    5: 'Viral'
}


def run_anomaly_detection(df_iso, iso_model=None, model_path='models/iso_forest.pkl'):
    """Run IF on user posts, return per-post performance level and anomaly flag."""
    try:
        if iso_model is None:
            iso_model = joblib.load(model_path)

        missing = [f for f in IF_FEATURES if f not in df_iso.columns]
        if missing:
            print(f"Missing IF features: {missing}")
            return _make_fallback(len(df_iso))

        X = df_iso[IF_FEATURES].copy()
        X = X.replace([np.inf, -np.inf], np.nan).fillna(0)

        # lower IF score = more anomalous (viral OR underperforming)
        scores = iso_model.decision_function(X.values)
        anomaly_flags = (scores < 0).tolist()

        # rank by engagement_rate for performance level 1-5
        er = X['engagement_rate'].values
        performance_levels = _rank_to_levels(er)

        results = []
        for i in range(len(df_iso)):
            level = performance_levels[i]
            results.append({
                'performance_level': level,
                'performance_label': LEVEL_LABELS[level],
                'anomaly_flag': anomaly_flags[i],
                'if_score': round(float(scores[i]), 4)
            })

        flagged = sum(anomaly_flags)
        print(f"Anomaly detection done: {flagged}/{len(df_iso)} posts flagged")
        return results

    except FileNotFoundError:
        print(f"Model not found: {model_path}")
        return _make_fallback(len(df_iso))
    except Exception as e:
        print(f"Anomaly detection error: {e}")
        return _make_fallback(len(df_iso))


def _rank_to_levels(er_array):
    """Convert engagement rate values to 1-5 performance levels."""
    try:
        levels = pd.qcut(er_array, q=5, labels=[1, 2, 3, 4, 5], duplicates='drop')
        return levels.astype(int).tolist()
    except Exception:
        # fallback for small datasets with many duplicate ER values
        pcts = np.percentile(er_array, [20, 40, 60, 80])
        result = []
        for val in er_array:
            if val <= pcts[0]:
                result.append(1)
            elif val <= pcts[1]:
                result.append(2)
            elif val <= pcts[2]:
                result.append(3)
            elif val <= pcts[3]:
                result.append(4)
            else:
                result.append(5)
        return result


def _make_fallback(n):
    """Return average-level results when model fails to load."""
    return [
        {'performance_level': 3, 'performance_label': 'Average',
         'anomaly_flag': False, 'if_score': 0.0}
        for _ in range(n)
    ]


if __name__ == "__main__":
    print("anomaly_mod.py loaded OK")
