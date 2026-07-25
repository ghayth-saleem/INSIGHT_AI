import os
import logging
import numpy as np
import joblib
from prophet import Prophet
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Input, Embedding, Flatten, Dense, Dropout, Concatenate
from tensorflow.keras.optimizers import Adam

logging.getLogger('prophet').setLevel(logging.ERROR)
logging.getLogger('cmdstanpy').setLevel(logging.ERROR)

from processor import load_and_process, get_account_stats_for_saving, compute_benchmarks

# Categorical features and their embedding config: (n_categories, embedding_dim)
CAT_FEATURES = {
    'media_type':       (3,  2),
    'content_category': (10, 4),
    'traffic_source':   (6,  3),
    'day_of_week':      (7,  3),
    'account_type':     (2,  2),
    'account_id':       (20, 5),
}

NUM_FEATURES = [
    'post_hour', 'follower_count', 'caption_length', 'hashtags_count',
    'has_call_to_action', 'impressions_to_reach_ratio', 'post_engagement_vs_account_avg'
]

IF_FEATURES = [
    'engagement_rate', 'reach', 'impressions', 'saves',
    'followers_gained', 'impressions_to_reach_ratio'
]


def build_label_encoders(df_dnn):
    """Build int-index mappings for each categorical feature from training data."""
    encoders = {}
    for feat in CAT_FEATURES:
        unique_vals = sorted(df_dnn[feat].dropna().unique().tolist())
        encoders[feat] = {v: i for i, v in enumerate(unique_vals)}
    return encoders


def build_dnn(label_encoders):
    """Build Keras Functional API model with Entity Embeddings."""
    cat_inputs = []
    cat_outputs = []

    for feat, (_, emb_dim) in CAT_FEATURES.items():
        n_cat = len(label_encoders[feat])
        inp = Input(shape=(1,), name=f'input_{feat}')
        emb = Embedding(input_dim=n_cat, output_dim=emb_dim, name=f'emb_{feat}')(inp)
        flat = Flatten(name=f'flat_{feat}')(emb)
        cat_inputs.append(inp)
        cat_outputs.append(flat)

    num_input = Input(shape=(len(NUM_FEATURES),), name='input_numerical')
    merged = Concatenate()(cat_outputs + [num_input])

    x = Dense(128, activation='relu')(merged)
    x = Dropout(0.3)(x)
    x = Dense(64, activation='relu')(x)
    x = Dropout(0.2)(x)
    output = Dense(1, activation='linear', name='engagement_rate')(x)

    model = Model(inputs=cat_inputs + [num_input], outputs=output)
    model.compile(optimizer=Adam(learning_rate=0.001), loss='mse', metrics=['mae'])
    return model


def prepare_dnn_inputs(df_dnn, label_encoders, scaler=None, fit_scaler=False):
    """Convert df_dnn into the list of arrays the Keras model expects."""
    cat_arrays = []
    for feat in CAT_FEATURES:
        mapping = label_encoders[feat]
        encoded = df_dnn[feat].map(lambda v: mapping.get(v, 0)).values.reshape(-1, 1)
        cat_arrays.append(encoded)

    num_data = df_dnn[NUM_FEATURES].values.astype(np.float32)
    if fit_scaler:
        num_data = scaler.fit_transform(num_data)
    else:
        num_data = scaler.transform(num_data)

    return cat_arrays + [num_data]


def train_all_models(dataset_path='Instagram_Analytics.csv'):
    print("Loading and processing training data...")
    df_iso, df_dnn, df_prophet, df_raw, _ = load_and_process(dataset_path, mode='training')

    if df_iso is None:
        print("ERROR: Failed to load data. Check the file path.")
        return

    os.makedirs('models', exist_ok=True)

    # ── 1. Isolation Forest ──────────────────────────────────────────────────
    print("\nTraining Isolation Forest...")
    iso_model = IsolationForest(n_estimators=100, contamination=0.05, random_state=42)
    iso_model.fit(df_iso[IF_FEATURES])
    joblib.dump(iso_model, 'models/iso_forest.pkl')
    print("Saved: models/iso_forest.pkl")

    # ── 2. DNN ───────────────────────────────────────────────────────────────
    print("\nTraining DNN...")

    label_encoders = build_label_encoders(df_dnn)
    joblib.dump(label_encoders, 'models/label_encoders.pkl')
    print("Saved: models/label_encoders.pkl")

    scaler = StandardScaler()
    X_inputs = prepare_dnn_inputs(df_dnn, label_encoders, scaler=scaler, fit_scaler=True)
    joblib.dump(scaler, 'models/scaler.pkl')
    print("Saved: models/scaler.pkl")

    y_target = df_raw['engagement_rate'].values.astype(np.float32)

    dnn_model = build_dnn(label_encoders)
    dnn_model.fit(
        X_inputs, y_target,
        epochs=50, batch_size=32,
        validation_split=0.2,
        verbose=1
    )
    dnn_model.save('models/dnn_model.h5')
    print("Saved: models/dnn_model.h5")

    # ── 3. Prophet (one model per account) ───────────────────────────────────
    print("\nTraining Prophet models (1 per account)...")

    # attach account_id from df_raw so we can group by account
    if df_prophet is not None:
        df_prophet = df_prophet.copy()
        df_prophet['account_id'] = df_raw['account_id'].values

    if df_prophet is not None and 'account_id' in df_prophet.columns:
        trained_count = 0
        for account_id, group in df_prophet.groupby('account_id'):
            # Prophet needs at least 2 rows — skip tiny groups
            if len(group) < 2:
                print(f"  Skipping account {account_id} — only {len(group)} rows")
                continue

            prophet_df = group[['ds', 'y']].copy().sort_values('ds').reset_index(drop=True)

            prophet_model = Prophet(
                weekly_seasonality=True,
                yearly_seasonality=False,
                daily_seasonality=False,
                interval_width=0.95
            )
            prophet_model.fit(prophet_df)

            save_path = f'models/prophet_account_{account_id}.pkl'
            joblib.dump(prophet_model, save_path)
            trained_count += 1
            print(f"  Saved: {save_path} ({len(prophet_df)} rows)")

        print(f"Prophet training complete. {trained_count} models saved.")
    else:
        print("WARNING: df_prophet is None or missing account_id — skipping Prophet training.")

    # ── 4. Account stats and benchmarks ─────────────────────────────────────
    print("\nSaving account stats and benchmarks...")
    account_stats = get_account_stats_for_saving(df_raw)
    joblib.dump(account_stats, 'models/account_stats.pkl')
    print("Saved: models/account_stats.pkl")

    benchmarks = compute_benchmarks(df_raw)
    joblib.dump(benchmarks, 'models/benchmarks.pkl')
    print("Saved: models/benchmarks.pkl")

    print("\nTraining complete. All models saved in models/")


if __name__ == "__main__":
    train_all_models('Instagram_Analytics.csv')
