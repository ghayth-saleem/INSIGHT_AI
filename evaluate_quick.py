import os
import sys
import io

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'modules'))

import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

output_lines = []

def log(msg=""):
    print(msg)
    output_lines.append(str(msg))

# ── Load data ────────────────────────────────────────────────────────────────
log("Loading data...")
from processor import load_and_process

CSV_PATH = 'Instagram_Analytics.csv'
df_iso, df_dnn, df_prophet, df_raw, meta = load_and_process(CSV_PATH, mode='training')
log(f"Dataset: {meta['total_posts']} posts loaded\n")

CAT_FEATURES = ['media_type', 'content_category', 'traffic_source',
                 'day_of_week', 'account_type', 'account_id']
NUM_FEATURES = ['post_hour', 'follower_count', 'caption_length', 'hashtags_count',
                'has_call_to_action', 'impressions_to_reach_ratio',
                'post_engagement_vs_account_avg']
IF_FEATURES  = ['engagement_rate', 'reach', 'impressions', 'saves',
                 'followers_gained', 'impressions_to_reach_ratio']

# ── 1. DNN ───────────────────────────────────────────────────────────────────
log("=" * 50)
log("MODEL 1: Deep Neural Network (DNN)")
log("=" * 50)

import tensorflow as tf
from tensorflow.keras.models import load_model

label_encoders = joblib.load('models/label_encoders.pkl')
scaler         = joblib.load('models/scaler.pkl')
dnn_model      = load_model('models/dnn_model.h5', compile=False)

# encode categorical columns
cat_arrays = []
for feat in CAT_FEATURES:
    mapping = label_encoders[feat]
    encoded = df_dnn[feat].map(lambda v, m=mapping: m.get(v, 0)).values.reshape(-1, 1)
    cat_arrays.append(encoded)

num_data = df_dnn[NUM_FEATURES].values.astype(np.float32)
num_scaled = scaler.transform(num_data)

y = df_raw['engagement_rate'].values.astype(np.float32)
n = len(y)

# 80/20 split by index (same random_state=42 as training)
idx = np.arange(n)
idx_train, idx_test = train_test_split(idx, test_size=0.2, random_state=42)

test_cat = [arr[idx_test] for arr in cat_arrays]
test_num = num_scaled[idx_test]
test_inputs = test_cat + [test_num]
y_test = y[idx_test]

y_pred = dnn_model.predict(test_inputs, verbose=0).flatten()
y_pred = np.clip(y_pred, 0, None)

mae  = mean_absolute_error(y_test, y_pred)
rmse = np.sqrt(mean_squared_error(y_test, y_pred))
r2   = r2_score(y_test, y_pred)

log(f"Test set size : {len(y_test)} posts")
log(f"Test MAE      : {mae:.6f}")
log(f"Test RMSE     : {rmse:.6f}")
log(f"Test R²       : {r2:.4f}")
log()

# ── 2. Isolation Forest ──────────────────────────────────────────────────────
log("=" * 50)
log("MODEL 2: Isolation Forest (Anomaly Detection)")
log("=" * 50)

iso_model = joblib.load('models/iso_forest.pkl')

X_iso = df_iso[IF_FEATURES].copy()
X_iso = X_iso.replace([np.inf, -np.inf], np.nan).fillna(0)

scores = iso_model.decision_function(X_iso.values)
preds  = iso_model.predict(X_iso.values)   # -1 = anomaly, 1 = normal

n_total    = len(preds)
n_anomaly  = int((preds == -1).sum())
pct        = round(n_anomaly / n_total * 100, 1)

log(f"Total posts       : {n_total}")
log(f"Anomalies flagged : {n_anomaly}  ({pct}%)")
log(f"Normal posts      : {n_total - n_anomaly}  ({100 - pct}%)")
log()

# performance level distribution via pd.qcut
er = X_iso['engagement_rate'].values
try:
    levels = pd.qcut(er, q=5, labels=[1, 2, 3, 4, 5], duplicates='drop').astype(int)
except Exception:
    pcts = np.percentile(er, [20, 40, 60, 80])
    levels = []
    for v in er:
        if   v <= pcts[0]: levels.append(1)
        elif v <= pcts[1]: levels.append(2)
        elif v <= pcts[2]: levels.append(3)
        elif v <= pcts[3]: levels.append(4)
        else:              levels.append(5)
    levels = pd.Series(levels)

labels = {1: 'Underperforming', 2: 'Below Average', 3: 'Average', 4: 'High', 5: 'Viral'}
log("Performance level distribution:")
for lv in [1, 2, 3, 4, 5]:
    cnt = int((levels == lv).sum())
    log(f"  Level {lv} ({labels[lv]:>15s}) : {cnt} posts")
log()

# ── 3. Prophet ───────────────────────────────────────────────────────────────
log("=" * 50)
log("MODEL 3: Prophet (Reach Forecasting) — account_id=1 sample")
log("=" * 50)

prophet_model = joblib.load('models/prophet_account_1.pkl')

# attach account_id from df_raw to df_prophet
df_p = df_prophet.copy()
df_p['account_id'] = df_raw['account_id'].values

account1 = df_p[df_p['account_id'] == 1][['ds', 'y']].copy()
account1['ds'] = pd.to_datetime(account1['ds'])
account1 = account1.sort_values('ds').reset_index(drop=True)

n1 = len(account1)
split = int(n1 * 0.8)
train_df = account1.iloc[:split]
test_df  = account1.iloc[split:]

if len(test_df) == 0:
    log(f"Account 1 has only {n1} rows — not enough for 80/20 split test.")
    log("Reporting in-sample MAE on all available rows instead.")
    future = prophet_model.make_future_dataframe(periods=0, freq='D')
    forecast = prophet_model.predict(future)
    merged = account1.merge(forecast[['ds', 'yhat']], on='ds', how='inner')
    y_act = merged['y'].values
    y_hat = merged['yhat'].values.clip(0)
else:
    future = prophet_model.make_future_dataframe(periods=len(test_df), freq='D')
    forecast = prophet_model.predict(future)
    test_dates = test_df['ds'].values
    forecast_test = forecast[forecast['ds'].isin(test_dates)][['ds', 'yhat']]
    merged = test_df.merge(forecast_test, on='ds', how='inner')
    if len(merged) == 0:
        log("No overlapping dates between test set and forecast — using tail of forecast.")
        yhat_tail = forecast.tail(len(test_df))['yhat'].values.clip(0)
        y_act = test_df['y'].values
        y_hat = yhat_tail
    else:
        y_act = merged['y'].values
        y_hat = merged['yhat'].values.clip(0)

p_mae  = mean_absolute_error(y_act, y_hat)
nonzero_mask = y_act != 0
mape = np.mean(np.abs((y_act[nonzero_mask] - y_hat[nonzero_mask]) / y_act[nonzero_mask])) * 100 if nonzero_mask.any() else float('nan')

log(f"Account 1 posts   : {n1}")
log(f"Test set size     : {len(y_act)}")
log(f"MAE  (reach)      : {p_mae:.2f}")
log(f"MAPE (reach)      : {mape:.2f}%")
log()

# ── 4. AraBERT ───────────────────────────────────────────────────────────────
log("=" * 50)
log("MODEL 4: AraBERT Sentiment (CAMeL-Lab)")
log("=" * 50)
log("Model        : CAMeL-Lab/bert-base-arabic-camelbert-da-sentiment")
log("Published F1 : 88%  (CAMeL-Lab benchmark on dialectal Arabic)")
log("Note         : Model is used as-is (no fine-tuning in this project)")
log()

# ── Summary ──────────────────────────────────────────────────────────────────
log("=" * 50)
log("SUMMARY")
log("=" * 50)
log(f"DNN          — MAE={mae:.4f}  RMSE={rmse:.4f}  R²={r2:.4f}")
log(f"Iso Forest   — {n_anomaly}/{n_total} anomalies ({pct}%)")
log(f"Prophet      — MAE={p_mae:.2f}  MAPE={mape:.2f}%")
log(f"AraBERT      — Published F1: 88% (dialectal Arabic)")

# ── Save to file ─────────────────────────────────────────────────────────────
with open('evaluation_results.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(output_lines) + '\n')

print("\nResults saved to evaluation_results.txt")
