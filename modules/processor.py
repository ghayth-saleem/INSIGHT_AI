import pandas as pd
import numpy as np
from typing import Dict

# ── Constants ──

ARABIC_TO_ENGLISH: Dict[str, str] = {
    "الوصول": "reach",
    "مدى الوصول": "reach",
    "مرات الظهور": "impressions",
    "عدد مرات الظهور": "impressions",
    "تسجيلات الإعجاب": "likes",
    "الإعجابات": "likes",
    "التعليقات": "comments",
    "المشاركات": "shares",
    "مشاركة": "shares",
    "الحفظ": "saves",
    "عمليات الحفظ": "saves",
    "متابعون جدد": "followers_gained",
    "المتابعون الجدد": "followers_gained",
    "عدد المتابعين": "follower_count",
    "التاريخ": "post_date",
    "وقت النشر": "post_datetime",
    "التاريخ والوقت": "post_datetime",
    "نوع المحتوى": "media_type",
    "نوع الوسائط": "media_type",
    "الوصف": "caption",
    "التعليق التوضيحي": "caption",
    "نص المنشور": "caption",
}

MEDIA_TYPE_MAP: Dict[str, str] = {
    "reel": "reel", "reels": "reel", "video": "reel",
    "ريل": "reel", "فيديو": "reel",
    "مقطع ريلز على ig": "reel", "مقطع فيديو": "reel",
    "image": "image", "photo": "image", "صورة": "image",
    "carousel": "carousel", "album": "carousel",
    "ألبوم": "carousel", "منشور دوار": "carousel",
}

NUMERIC_COLS = [
    "likes", "comments", "shares", "saves",
    "reach", "impressions",
    "followers_gained", "follower_count",
    "caption_length", "hashtags_count",
    "has_call_to_action", "post_hour",
]

ISO_FEATURES = [
    "engagement_rate", "reach", "impressions",
    "saves", "followers_gained", "impressions_to_reach_ratio",
]

DNN_CATEGORICAL = [
    "media_type", "content_category", "traffic_source",
    "day_of_week", "account_type", "account_id",
]
DNN_NUMERICAL = [
    "post_hour", "follower_count", "caption_length",
    "hashtags_count", "has_call_to_action",
    "impressions_to_reach_ratio", "post_engagement_vs_account_avg",
]
DNN_TARGET = "engagement_rate"

# ── Processing ──

def _preprocess(df: pd.DataFrame, mode: str):
    """Clean and standardize the raw DataFrame. Returns cleaned df and detected mode."""
    # detect mode if needed
    if mode == "auto":
        has_arabic = any(any("؀" <= ch <= "ۿ" for ch in col) for col in df.columns)
        if has_arabic:
            mode = "inference"
        elif len(df) > 500 and "account_id" in df.columns:
            mode = "training"
        else:
            mode = "inference"
        print(f"Auto-detected mode: {mode}")
    else:
        print(f"Using explicit mode: {mode}")

    # map Arabic columns to English
    df = df.rename(columns=ARABIC_TO_ENGLISH)

    # fill missing columns for user uploads
    if mode == "inference":
        defaults = {
            "account_id": "user_upload", "account_type": "brand",
            "content_category": "Beauty", "traffic_source": "Home Feed",
            "has_call_to_action": 0.0, "followers_gained": 0.0, "follower_count": 5200.0,
        }
        for col, val in defaults.items():
            if col not in df.columns:
                df[col] = val
        if "impressions" not in df.columns and "reach" in df.columns:
            df["impressions"] = df["reach"]

    # cast numeric columns to float
    for col in NUMERIC_COLS:
        if col not in df.columns:
            continue
        cleaned = (
            df[col].astype(str).str.strip()
            .str.replace(",", "", regex=False)
            .str.replace("-", "0", regex=False)
        )
        df[col] = pd.to_numeric(cleaned, errors="coerce").fillna(0.0)

    # parse datetime and extract hour and day
    if "post_datetime" not in df.columns and "post_date" in df.columns:
        df["post_datetime"] = df["post_date"]
    if "post_datetime" in df.columns:
        df["post_datetime"] = pd.to_datetime(df["post_datetime"], errors="coerce")
        if "post_hour" not in df.columns:
            df["post_hour"] = df["post_datetime"].dt.hour.fillna(0).astype(float)
        if "day_of_week" not in df.columns:
            df["day_of_week"] = df["post_datetime"].dt.day_name().fillna("Unknown")

    # compute caption_length and hashtags_count
    if "caption_length" not in df.columns or "hashtags_count" not in df.columns:
        if "caption" in df.columns:
            text = df["caption"].fillna("").astype(str)
            df["caption_length"] = text.str.len().astype(float)
            df["hashtags_count"] = text.apply(lambda x: float(x.count("#")))
        else:
            df["caption_length"] = 0.0
            df["hashtags_count"] = 0.0

    # normalize media_type values
    if "media_type" in df.columns:
        df["media_type"] = (
            df["media_type"].astype(str).str.strip().str.lower()
            .map(MEDIA_TYPE_MAP).fillna("reel")
        )
    else:
        df["media_type"] = "reel"

    return df, mode


def _engineer_features(df: pd.DataFrame, mode: str, account_stats: pd.DataFrame):
    """Engineer engagement_rate, impressions ratio, and account z-score features."""
    # recalculate engagement_rate
    interaction_sum = df[["likes", "comments", "shares", "saves"]].sum(axis=1)
    safe_reach = df["reach"].replace(0, np.nan)
    df["engagement_rate"] = (interaction_sum / safe_reach).fillna(0.0)

    # compute impressions_to_reach_ratio
    df["impressions_to_reach_ratio"] = (df["impressions"] / safe_reach).fillna(1.0)

    # compute post_engagement_vs_account_avg
    if mode == "training":
        account_mean = df.groupby("account_id")["engagement_rate"].transform("mean")
        account_std = (
            df.groupby("account_id")["engagement_rate"]
            .transform("std").replace(0, 1e-8).fillna(1e-8)
        )
        df["post_engagement_vs_account_avg"] = (df["engagement_rate"] - account_mean) / account_std
        df["_account_mean_er"] = account_mean
        df["_account_std_er"] = account_std
    else:
        if account_stats is not None:
            global_mean = float(account_stats["mean"].mean())
            global_std = max(float(account_stats["std"].mean()), 1e-8)
            df["post_engagement_vs_account_avg"] = (df["engagement_rate"] - global_mean) / global_std
        else:
            local_mean = float(df["engagement_rate"].mean())
            local_std = max(float(df["engagement_rate"].std()), 1e-8)
            df["post_engagement_vs_account_avg"] = (df["engagement_rate"] - local_mean) / local_std
            print("Warning: account_stats not provided — z-scores are relative to this upload only.")

    return df


def _build_outputs(df: pd.DataFrame, mode: str, original_columns: list):
    """Build df_iso, df_dnn, df_prophet, and meta from the cleaned DataFrame."""
    # --- df_iso ---
    missing = [c for c in ISO_FEATURES if c not in df.columns]
    if missing:
        raise ValueError(f"df_iso missing columns: {missing}")
    df_iso = df[ISO_FEATURES].dropna().reset_index(drop=True)

    # --- df_dnn ---
    # Excluded: likes/comments/shares/saves (target components), reach/impressions (leakage),
    # followers_gained (outcome), performance_bucket_label (circular), is_viral_signal (IF leakage)
    all_dnn_cols = DNN_CATEGORICAL + DNN_NUMERICAL + [DNN_TARGET]
    result = {}
    for col in all_dnn_cols:
        if col in df.columns:
            result[col] = df[col].values
        else:
            print(f"Warning: df_dnn missing '{col}' — using default.")
            result[col] = "unknown" if col in DNN_CATEGORICAL else 0.0
    df_dnn = pd.DataFrame(result, index=df.index)

    # --- df_prophet ---
    if "post_datetime" not in df.columns:
        raise ValueError("df_prophet requires 'post_datetime' column.")
    df_prophet = (
        pd.DataFrame({"ds": df["post_datetime"], "y": df["reach"]})
        .dropna().sort_values("ds").reset_index(drop=True)
    )
    if len(df_prophet) < 2:
        raise ValueError(f"df_prophet has only {len(df_prophet)} rows. Prophet needs at least 2.")

    # --- meta ---
    account_name = str(df["account_id"].value_counts().index[0]) if "account_id" in df.columns else "unknown"
    date_from = str(df["post_datetime"].dropna().min().date()) if "post_datetime" in df.columns else "unknown"
    date_to = str(df["post_datetime"].dropna().max().date()) if "post_datetime" in df.columns else "unknown"
    captions_detected = (
        "caption" in df.columns
        and df["caption"].dropna().astype(str).apply(lambda x: len(x) > 5).any()
    )
    meta = {
        "mode": mode,
        "total_posts": len(df),
        "account_name": account_name,
        "date_range": {"from": date_from, "to": date_to},
        "captions_detected": bool(captions_detected),
        "columns_mapped": [c for c in original_columns if c in ARABIC_TO_ENGLISH],
    }

    return df_iso, df_dnn, df_prophet, meta

# ── Public API ──

def load_and_process(filepath: str, mode: str = "auto", account_stats: pd.DataFrame = None):
    """Load CSV, engineer features, and return 4 DataFrames + metadata."""
    for encoding in ("utf-8", "utf-8-sig", "cp1256"):
        try:
            df = pd.read_csv(filepath, encoding=encoding)
            df.columns = df.columns.str.strip()
            print(f"Loaded {filepath} with encoding={encoding}, shape={df.shape}")
            break
        except UnicodeDecodeError:
            print(f"Encoding {encoding} failed, trying next.")
    else:
        raise ValueError(f"Could not load '{filepath}' with any supported encoding (utf-8, utf-8-sig, cp1256).")

    original_columns = list(df.columns)

    df, mode = _preprocess(df, mode)
    df = _engineer_features(df, mode, account_stats)
    df_iso, df_dnn, df_prophet, meta = _build_outputs(df, mode, original_columns)

    df_raw = df.copy()
    print(f"Done | mode={mode} | posts={meta['total_posts']} | iso={len(df_iso)} | dnn={len(df_dnn)} | prophet={len(df_prophet)}")

    return df_iso, df_dnn, df_prophet, df_raw, meta

# ── Utilities ──

def get_account_stats_for_saving(df_raw: pd.DataFrame) -> pd.DataFrame:
    """Return per-account mean and std of engagement_rate for saving."""
    if "account_id" not in df_raw.columns or "engagement_rate" not in df_raw.columns:
        raise ValueError(
            "df_raw must contain 'account_id' and 'engagement_rate' columns."
        )
    return (
        df_raw.groupby("account_id")["engagement_rate"]
        .agg(mean="mean", std="std")
        .fillna({"std": 1e-8})  # single-post accounts have std=NaN
    )


def compute_benchmarks(df_raw: pd.DataFrame) -> Dict:
    """Return per-category benchmark averages from training data."""
    if "content_category" not in df_raw.columns:
        print("Warning: 'content_category' column not found — returning empty dict.")
        return {}

    df = df_raw.copy()

    safe_reach = df["reach"].replace(0, np.nan)

    if "follower_count" in df.columns:
        safe_follower_count = df["follower_count"].replace(0, np.nan)
        df["_reach_rate"] = df["reach"] / safe_follower_count
    else:
        df["_reach_rate"] = np.nan

    if "saves" in df.columns:
        df["_save_rate"] = df["saves"] / safe_reach
    else:
        df["_save_rate"] = np.nan

    result: Dict = {}
    for category, group in df.groupby("content_category"):
        result[str(category)] = {
            "avg_er": round(float(group["engagement_rate"].mean()), 6),
            "avg_reach_rate": round(float(group["_reach_rate"].mean()), 6),
            "avg_save_rate": round(float(group["_save_rate"].mean()), 6),
            "n": int(len(group)),
        }

    return result
