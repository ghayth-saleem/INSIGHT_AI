import os
import logging
import joblib
import numpy as np
import pandas as pd

logging.getLogger('prophet').setLevel(logging.ERROR)
logging.getLogger('cmdstanpy').setLevel(logging.ERROR)

DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']


def _load_best_model(df_raw, account_stats, models_dir):
    """Find training account closest to user's avg ER and load its Prophet model."""
    if df_raw is None or len(df_raw) == 0:
        return None, None

    # compute user's average engagement rate
    user_avg_er = df_raw['engagement_rate'].mean() if 'engagement_rate' in df_raw.columns else 0.042

    # find training account with closest mean ER
    diff = (account_stats['mean'] - user_avg_er).abs()
    best_account_id = int(diff.idxmin())

    model_path = os.path.join(models_dir, f'prophet_account_{best_account_id}.pkl')
    if not os.path.exists(model_path):
        print(f"Prophet model not found: {model_path}")
        return None, best_account_id

    model = joblib.load(model_path)
    print(f"Loaded prophet_account_{best_account_id}.pkl (user ER={user_avg_er:.4f}, account ER={account_stats.loc[best_account_id,'mean']:.4f})")
    return model, best_account_id


def _compute_confidence(forecast):
    """Compute confidence level from average interval width relative to yhat."""
    future_rows = forecast.tail(7)
    yhat = future_rows['yhat'].values
    upper = future_rows['yhat_upper'].values
    lower = future_rows['yhat_lower'].values

    # avoid division by zero
    nonzero = yhat != 0
    if not nonzero.any():
        return 'low'

    avg_width_ratio = np.mean((upper[nonzero] - lower[nonzero]) / np.abs(yhat[nonzero]))

    if avg_width_ratio < 1.0:
        return 'high'
    elif avg_width_ratio < 2.5:
        return 'medium'
    else:
        return 'low'


def _get_weekly_seasonality(forecast):
    """Extract average weekly component for each day of the week."""
    temp = forecast[['ds', 'weekly']].copy()
    temp['day_name'] = temp['ds'].dt.day_name()
    day_avgs = temp.groupby('day_name')['weekly'].mean()

    result = {}
    for day in DAY_ORDER:
        result[day] = round(float(day_avgs.get(day, 0.0)), 4)
    return result


def _get_best_day(weekly_seasonality):
    """Return the day with highest weekly component."""
    return max(weekly_seasonality, key=weekly_seasonality.get)


def _get_hourly_from_data(df_raw):
    """Compute average reach per hour from user's actual posts."""
    if df_raw is None or 'post_hour' not in df_raw.columns or 'reach' not in df_raw.columns:
        return {}, 6

    hourly = df_raw.groupby('post_hour')['reach'].mean()
    if len(hourly) == 0:
        return {}, 6

    best_hour = int(hourly.idxmax())
    # return top 5 hours only
    top_hours = hourly.nlargest(5)
    hourly_dict = {str(int(h)): round(float(v), 2) for h, v in top_hours.items()}
    return hourly_dict, best_hour


def _get_trend(forecast):
    """Determine trend direction from first vs last trend value."""
    trend_vals = forecast['trend'].values
    first = trend_vals[0]
    last = trend_vals[-1]
    pct_change = (last - first) / abs(first) * 100 if first != 0 else 0

    if pct_change > 5:
        direction = 'growing'
        summary = f"Upward trend detected over the forecast period (+{pct_change:.1f}%)."
    elif pct_change < -5:
        direction = 'declining'
        summary = f"Mild downward trend detected over the forecast period ({pct_change:.1f}%)."
    else:
        direction = 'stable'
        summary = "Account reach is relatively stable with no strong trend direction."

    return direction, summary


def _build_forecast_7_days(forecast):
    """Build the 7-day forecast array from the future rows."""
    future_rows = forecast.tail(7).copy()
    result = []
    for _, row in future_rows.iterrows():
        result.append({
            'date': row['ds'].strftime('%Y-%m-%d'),
            'predicted_reach': max(0, int(round(row['yhat']))),
            'lower': max(0, int(round(row['yhat_lower']))),
            'upper': max(0, int(round(row['yhat_upper'])))
        })
    return result


def run_prophet_analysis(df_prophet, df_raw, account_stats=None, models_dir='models'):
    """Run Prophet inference using a pre-trained model matched to the user's account."""
    fallback = {
        'trend_direction': 'stable',
        'trend_summary': 'Trend analysis unavailable.',
        'best_day': 'Friday',
        'best_hour': 6,
        'weekly_seasonality': {d: 0.0 for d in DAY_ORDER},
        'hourly_seasonality': {},
        'forecast_7_days': [],
        'confidence_level': 'low'
    }

    try:
        # load account_stats if not passed in
        if account_stats is None:
            stats_path = os.path.join(models_dir, 'account_stats.pkl')
            if not os.path.exists(stats_path):
                print("account_stats.pkl not found — returning fallback")
                return fallback
            account_stats = joblib.load(stats_path)

        # load the best matching pre-trained Prophet model
        model, matched_id = _load_best_model(df_raw, account_stats, models_dir)
        if model is None:
            print("No Prophet model loaded — returning fallback")
            return fallback

        # build future dataframe using user's date range + 7 days ahead
        if df_prophet is not None and len(df_prophet) > 0:
            last_date = pd.to_datetime(df_prophet['ds']).max()
        else:
            last_date = pd.Timestamp.now()

        future = model.make_future_dataframe(periods=7, freq='D')
        forecast = model.predict(future)

        # extract all outputs
        weekly_seasonality = _get_weekly_seasonality(forecast)
        best_day = _get_best_day(weekly_seasonality)
        hourly_seasonality, best_hour = _get_hourly_from_data(df_raw)
        trend_direction, trend_summary = _get_trend(forecast)
        forecast_7_days = _build_forecast_7_days(forecast)
        confidence_level = _compute_confidence(forecast)

        return {
            'trend_direction': trend_direction,
            'trend_summary': trend_summary,
            'best_day': best_day,
            'best_hour': best_hour,
            'weekly_seasonality': weekly_seasonality,
            'hourly_seasonality': hourly_seasonality,
            'forecast_7_days': forecast_7_days,
            'confidence_level': confidence_level
        }

    except Exception as e:
        print(f"Prophet analysis failed: {e}")
        return fallback


if __name__ == "__main__":
    import sys
    sys.path.insert(0, 'modules')
    from processor import load_and_process

    df_iso, df_dnn, df_prophet, df_raw, meta = load_and_process(
        'Instagram_Analytics.csv', mode='training'
    )
    result = run_prophet_analysis(df_prophet, df_raw)
    import json
    print(json.dumps(result, indent=2))
