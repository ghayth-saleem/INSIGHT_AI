import numpy as np
import joblib
import tensorflow as tf
from tensorflow.keras.models import load_model

# Must match train_engine.py exactly — do not change order
CAT_FEATURES = ['media_type', 'content_category', 'traffic_source',
                 'day_of_week', 'account_type', 'account_id']
NUM_FEATURES = ['post_hour', 'follower_count', 'caption_length', 'hashtags_count',
                'has_call_to_action', 'impressions_to_reach_ratio',
                'post_engagement_vs_account_avg']


def _get_performance_bucket(er):
    """Map predicted ER float to a label string."""
    if er < 0.025:
        return 'Underperforming'
    elif er < 0.040:
        return 'Below Average'
    elif er < 0.055:
        return 'Average'
    elif er < 0.070:
        return 'High'
    else:
        return 'Viral'


def _compute_feature_importance(model, cat_arrays, num_array_scaled):
    """Gradient x input attribution for the 7 numerical features."""
    try:
        num_tensor = tf.constant([num_array_scaled], dtype=tf.float32)
        cat_tensors = [tf.constant([[v]], dtype=tf.int32) for v in cat_arrays]

        with tf.GradientTape() as tape:
            tape.watch(num_tensor)
            all_inputs = cat_tensors + [num_tensor]
            pred = model(all_inputs, training=False)

        grads = tape.gradient(pred, num_tensor)
        if grads is None:
            return []

        attributions = (grads.numpy()[0] * num_array_scaled).tolist()
        results = []
        for i, feat in enumerate(NUM_FEATURES):
            results.append({
                'feature': feat,
                'contribution': round(abs(attributions[i]), 4),
                'direction': 'positive' if attributions[i] >= 0 else 'negative'
            })

        results.sort(key=lambda x: x['contribution'], reverse=True)
        return results[:5]

    except Exception as e:
        print(f"⚠️ Feature importance failed: {e}")
        return []


def predict_engagement(post_config,
                       model=None, scaler=None, label_encoders=None, account_stats=None,
                       model_path='models/dnn_model.h5',
                       scaler_path='models/scaler.pkl',
                       encoders_path='models/label_encoders.pkl',
                       stats_path='models/account_stats.pkl'):
    """Predict engagement rate for a single post config dict (What-If Simulator)."""
    try:
        # Load artifacts if not pre-loaded by FastAPI startup
        if model is None:
            print("Loading DNN model from disk...")
            model = load_model(model_path, compile=False)
            scaler = joblib.load(scaler_path)
            label_encoders = joblib.load(encoders_path)
            account_stats = joblib.load(stats_path)

        # Encode each categorical using the label_encoders dict
        # label_encoders = {'media_type': {'reel': 0, 'image': 1, ...}, ...}
        cat_arrays = []
        for feat in CAT_FEATURES:
            val = post_config.get(feat)
            encoder_dict = label_encoders.get(feat, {})
            encoded_val = encoder_dict.get(val, 0)  # default 0 for unknown values
            if val not in encoder_dict:
                print(f"⚠️ Unknown value '{val}' for '{feat}', defaulting to 0")
            cat_arrays.append(encoded_val)

        # Build numerical array — order must match NUM_FEATURES exactly
        # post_engagement_vs_account_avg = 0.0 because we are predicting ER, not observing it
        # account_id defaults to 1 for users not in training set
        raw_numerical = [
            float(post_config.get('post_hour', 12)),
            float(post_config.get('follower_count', 5000)),
            float(post_config.get('caption_length', 100)),
            float(post_config.get('hashtags_count', 5)),
            float(post_config.get('has_call_to_action', 0)),
            float(post_config.get('impressions_to_reach_ratio', 1.2)),
            0.0  # post_engagement_vs_account_avg — neutral assumption for What-If
        ]
        num_array_scaled = scaler.transform([raw_numerical])[0]

        # Build multi-input list: [cat1_array, cat2_array, ..., numerical_array]
        # This matches the Keras Functional API model input order from train_engine.py
        model_inputs = [np.array([[v]]) for v in cat_arrays] + [np.array([num_array_scaled])]

        # Run prediction
        raw_pred = model.predict(model_inputs, verbose=0)
        predicted_er = float(raw_pred[0][0])
        predicted_er = max(0.0, predicted_er)  # clip any negative output

        bucket = _get_performance_bucket(predicted_er)
        top_features = _compute_feature_importance(model, cat_arrays, num_array_scaled)

        print(f"✅ DNN prediction: ER={predicted_er:.4f}, bucket={bucket}")

        return {
            'predicted_er': round(predicted_er, 4),
            'performance_bucket': bucket,
            'top_contributing_features': top_features
        }

    except FileNotFoundError as e:
        print(f"❌ Model files not found: {e}")
        return {'predicted_er': 0.042, 'performance_bucket': 'Average', 'top_contributing_features': []}
    except Exception as e:
        print(f"⚠️ DNN inference error: {e}")
        return {'predicted_er': 0.042, 'performance_bucket': 'Average', 'top_contributing_features': []}


if __name__ == "__main__":
    # Quick smoke test — paste a real post config and check output
    test_config = {
        "media_type": "reel",
        "content_category": "Beauty",
        "traffic_source": "Home Feed",
        "day_of_week": "Friday",
        "account_type": "brand",
        "account_id": 1,
        "post_hour": 6,
        "follower_count": 5200,
        "caption_length": 120,
        "hashtags_count": 8,
        "has_call_to_action": 1,
        "impressions_to_reach_ratio": 1.3
    }
    result = predict_engagement(test_config)
    print(result)
