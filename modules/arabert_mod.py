import os
# redirect HuggingFace cache to project drive to avoid C drive space issues
os.environ['HF_HOME'] = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'hf_cache')

from transformers import pipeline
import pandas as pd

# cached model — loaded once, reused on every call
_sentiment_pipeline = None

def _load_model():
    """Load Arabic sentiment model once and cache it."""
    global _sentiment_pipeline
    if _sentiment_pipeline is not None:
        return _sentiment_pipeline

    model_name = "CAMeL-Lab/bert-base-arabic-camelbert-da-sentiment"
    print(f"Loading AraBERT sentiment model: {model_name}")
    try:
        _sentiment_pipeline = pipeline(
            "text-classification",
            model=model_name,
            tokenizer=model_name,
            truncation=True,
            max_length=128
        )
        print("AraBERT model loaded successfully.")
    except Exception as e:
        print(f"Failed to load primary model: {e}")
        _sentiment_pipeline = None
    return _sentiment_pipeline


def _classify_writing_style(caption):
    """Keyword-based writing style classification for Arabic captions."""
    if not isinstance(caption, str) or len(caption.strip()) == 0:
        return "General"

    promotional_kw = ["عرض", "خصم", "تخفيض", "سعر", "price", "offer", "sale", "مجانا", "هدية"]
    aspirational_kw = ["تستاهل", "أفخم", "فاخر", "رفاهية", "حياتك", "luxury", "تستحق", "فخامة", "أناقة"]
    informational_kw = ["مكونات", "طبيعي", "يدوم", "تفاصيل", "معلومات", "مكون", "نسبة", "يحتوي"]
    conversational_kw = ["شو رأيكم", "مين", "كيف", "؟", "استفسار", "رأيك", "بتحب", "شاركنا"]

    for kw in promotional_kw:
        if kw in caption:
            return "Promotional"
    for kw in aspirational_kw:
        if kw in caption:
            return "Aspirational"
    for kw in informational_kw:
        if kw in caption:
            return "Informational"
    for kw in conversational_kw:
        if kw in caption:
            return "Conversational"
    return "General"


def _map_label(raw_label):
    """Map model output label to standard Positive/Neutral/Negative."""
    label = raw_label.lower().strip()
    if "pos" in label or label == "label_2":
        return "Positive"
    elif "neg" in label or label == "label_0":
        return "Negative"
    else:
        return "Neutral"


def _build_insight(pos_er, neg_er, neu_er):
    """Generate a plain-text insight string from ER averages."""
    best = max(pos_er, neg_er, neu_er)
    if best == pos_er and pos_er > 0 and neg_er > 0:
        diff_pct = round(((pos_er - neg_er) / neg_er) * 100)
        return f"Positive-tone captions average {diff_pct}% more engagement than negative captions."
    elif best == neg_er and neg_er > 0 and pos_er > 0:
        diff_pct = round(((neg_er - pos_er) / pos_er) * 100)
        return f"Negative-tone captions average {diff_pct}% more engagement than positive captions."
    else:
        return "No significant engagement difference detected between sentiment categories."


def run_sentiment_analysis(df_raw, model=None):
    """Analyze Arabic captions for sentiment and writing style."""

    # check required columns exist
    if 'caption' not in df_raw.columns or 'engagement_rate' not in df_raw.columns:
        return {"available": False, "message": "Missing required columns: caption or engagement_rate."}

    # drop rows with empty captions
    df = df_raw[['caption', 'engagement_rate']].copy()
    df = df[df['caption'].notna() & (df['caption'].str.strip() != "")]

    if len(df) == 0:
        return {"available": False, "message": "No caption text found in uploaded data."}

    # load model
    sentiment_model = model if model is not None else _load_model()
    if sentiment_model is None:
        return {"available": False, "message": "Could not load Arabic sentiment model."}

    print(f"Running sentiment analysis on {len(df)} posts...")

    posts_output = []
    sentiments = []

    try:
        for idx, row in df.iterrows():
            caption = str(row['caption'])
            er = float(row['engagement_rate']) if pd.notna(row['engagement_rate']) else 0.0

            try:
                result = sentiment_model(caption[:512])[0]
                sentiment_label = _map_label(result['label'])
                sentiment_score = round(float(result['score']), 4)
            except Exception as e:
                print(f"Inference failed for post {idx}: {e}")
                sentiment_label = "Neutral"
                sentiment_score = 0.5

            writing_style = _classify_writing_style(caption)
            caption_preview = caption[:80] + ("..." if len(caption) > 80 else "")

            posts_output.append({
                "post_id": f"post_{idx + 1}",
                "caption_preview": caption_preview,
                "sentiment": sentiment_label,
                "sentiment_score": sentiment_score,
                "engagement_rate": round(er, 6),
                "writing_style": writing_style
            })
            sentiments.append({"sentiment": sentiment_label, "er": er, "style": writing_style})

    except Exception as e:
        return {"available": False, "message": f"Sentiment analysis failed: {str(e)}"}

    # compute summary stats
    sent_df = pd.DataFrame(sentiments)

    pos_avg = round(sent_df[sent_df['sentiment'] == 'Positive']['er'].mean(), 6) if 'Positive' in sent_df['sentiment'].values else 0.0
    neg_avg = round(sent_df[sent_df['sentiment'] == 'Negative']['er'].mean(), 6) if 'Negative' in sent_df['sentiment'].values else 0.0
    neu_avg = round(sent_df[sent_df['sentiment'] == 'Neutral']['er'].mean(), 6) if 'Neutral' in sent_df['sentiment'].values else 0.0

    # best writing style by average ER
    style_er = sent_df.groupby('style')['er'].mean()
    best_style = style_er.idxmax() if len(style_er) > 0 else "General"

    insight = _build_insight(pos_avg, neg_avg, neu_avg)

    print(f"Sentiment analysis done. Positive: {(sent_df['sentiment'] == 'Positive').sum()}, Negative: {(sent_df['sentiment'] == 'Negative').sum()}, Neutral: {(sent_df['sentiment'] == 'Neutral').sum()}")

    return {
        "available": True,
        "posts": posts_output,
        "summary": {
            "positive_avg_er": pos_avg,
            "negative_avg_er": neg_avg,
            "neutral_avg_er": neu_avg,
            "best_writing_style": best_style,
            "insight": insight
        }
    }
