import time
import requests
from typing import List
from pydantic import BaseModel
from fastapi import APIRouter, Request, HTTPException

router = APIRouter()

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "qwen2.5:7b-instruct-q4_K_M"


class ChatRequest(BaseModel):
    question: str
    conversation_history: List[dict] = []


def _build_context(session):
    """Build a plain-text data summary from all session results for the LLM prompt."""
    meta = session['meta']
    df_raw = session['df_raw']
    anomaly_results = session['anomaly_results']
    prophet_results = session['prophet_results']
    dnn_results = session.get('dnn_results', [])

    # --- Account overview ---
    total_posts = meta.get('total_posts', len(df_raw))
    avg_er = round(float(df_raw['engagement_rate'].mean()) * 100, 2)
    avg_reach = int(df_raw['reach'].mean()) if 'reach' in df_raw.columns else 0
    date_range = meta.get('date_range', {})

    lines = [
        f"Account: {meta.get('account_name', 'unknown')}",
        f"Total posts analyzed: {total_posts}",
        f"Date range: {date_range.get('from', '?')} to {date_range.get('to', '?')}",
        f"Average engagement rate: {avg_er}%",
        f"Average reach per post: {avg_reach}",
    ]

    # --- Anomaly summary ---
    level_counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for r in anomaly_results:
        lvl = r.get('performance_level', 3)
        level_counts[lvl] = level_counts.get(lvl, 0) + 1

    lines.append(f"\nPerformance breakdown: Viral(5)={level_counts[5]}, High(4)={level_counts[4]}, Average(3)={level_counts[3]}, Below Avg(2)={level_counts[2]}, Underperforming(1)={level_counts[1]}")

    # top and bottom posts
    viral_posts = [r for r in anomaly_results if r.get('performance_level', 3) >= 5]
    weak_posts = [r for r in anomaly_results if r.get('performance_level', 3) <= 2]
    if viral_posts:
        vp = viral_posts[0]
        lines.append(f"Top viral post: {vp.get('date', '?')} ({vp.get('media_type', '?')}) -- {vp.get('shap_explanation', 'no explanation available')}")
    if weak_posts:
        wp = weak_posts[0]
        lines.append(f"Weakest post: {wp.get('date', '?')} ({wp.get('media_type', '?')}) -- {wp.get('shap_explanation', 'no explanation available')}")

    # --- Prophet summary ---
    trend = prophet_results.get('trend_direction', 'unknown')
    best_day = prophet_results.get('best_day', 'unknown')
    best_hour = prophet_results.get('best_hour', 'unknown')
    lines.append(f"\nTrend direction: {trend}")
    lines.append(f"Best posting day: {best_day}")
    lines.append(f"Best posting hour: {best_hour}:00")

    weekly = prophet_results.get('weekly_seasonality', {})
    if weekly:
        sorted_days = sorted(weekly.items(), key=lambda x: x[1], reverse=True)
        top3 = ', '.join([f"{d}({round(v * 100, 2)}%)" for d, v in sorted_days[:3]])
        lines.append(f"Top 3 days by engagement: {top3}")

    # --- DNN summary ---
    if dnn_results:
        ers = [r.get('predicted_er', 0) for r in dnn_results if r.get('predicted_er') is not None]
        if ers:
            lines.append(f"\nDNN predicted ER range: {round(min(ers) * 100, 2)}% - {round(max(ers) * 100, 2)}%")

    # --- AraBERT summary ---
    arabert = session.get('arabert_results')
    if arabert and arabert.get('available'):
        summary = arabert.get('summary', {})
        posts_list = arabert.get('posts', [])

        # sentiment distribution
        pos_count = sum(1 for p in posts_list if p.get('sentiment') == 'Positive')
        neg_count = sum(1 for p in posts_list if p.get('sentiment') == 'Negative')
        neu_count = sum(1 for p in posts_list if p.get('sentiment') == 'Neutral')
        lines.append(f"\nCaption sentiment analysis ({len(posts_list)} captions analyzed):")
        lines.append(f"Positive: {pos_count}, Negative: {neg_count}, Neutral: {neu_count}")

        # avg ER per sentiment
        pos_er = summary.get('positive_avg_er')
        neg_er = summary.get('negative_avg_er')
        neu_er = summary.get('neutral_avg_er')
        if pos_er is not None:
            lines.append(f"Avg ER for positive captions: {round(float(pos_er) * 100, 2)}%")
        if neg_er is not None:
            lines.append(f"Avg ER for negative captions: {round(float(neg_er) * 100, 2)}%")
        if neu_er is not None:
            lines.append(f"Avg ER for neutral captions: {round(float(neu_er) * 100, 2)}%")

        # best writing style
        best_style = summary.get('best_writing_style', '')
        if best_style:
            lines.append(f"Best performing writing style: {best_style}")

        # insight string
        insight = summary.get('insight', '')
        if insight:
            lines.append(f"Key insight: {insight}")

    return '\n'.join(lines)


def _build_sources(session):
    """List which modules have data loaded in this session."""
    sources = []
    if session.get('anomaly_results'):
        sources.append('isolation_forest')
    if session.get('dnn_results'):
        sources.append('dnn')
    if session.get('prophet_results'):
        sources.append('prophet')
    arabert = session.get('arabert_results')
    if arabert and arabert.get('available'):
        sources.append('arabert')
    return sources


def _format_history(history):
    """Convert conversation history list into a readable string for the prompt."""
    if not history:
        return ""
    lines = ["\nPREVIOUS CONVERSATION:"]
    for msg in history[-6:]:  # keep last 6 messages max to fit context window
        role = msg.get('role', 'user')
        content = msg.get('content', '')
        lines.append(f"{role.upper()}: {content}")
    return '\n'.join(lines)


def _call_ollama(prompt, timeout=120):
    """Send prompt to Ollama and return response text. Returns None on failure."""
    try:
        resp = requests.post(
            OLLAMA_URL,
            json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
            timeout=timeout
        )
        resp.raise_for_status()
        return resp.json().get('response', '')
    except Exception as e:
        print(f"Ollama chatbot call failed: {e}")
        return None


def _fallback_answer(question, session):
    """Keyword-based canned responses when Ollama is unavailable."""
    q = question.lower()
    prophet = session['prophet_results']
    anomaly = session['anomaly_results']

    best_day = prophet.get('best_day', 'Friday')
    best_hour = prophet.get('best_hour', 6)
    trend = prophet.get('trend_direction', 'stable')

    viral_count = sum(1 for r in anomaly if r.get('performance_level', 3) >= 5)
    weak_count = sum(1 for r in anomaly if r.get('performance_level', 3) <= 2)

    if 'best time' in q or 'when' in q or 'post time' in q or 'best day' in q:
        return f"Based on the trend analysis, your best posting time is {best_day} at {best_hour:02d}:00. Posts published at this time showed the highest average engagement."

    if 'viral' in q or 'best post' in q or 'top post' in q:
        if viral_count > 0:
            vp = next((r for r in anomaly if r.get('performance_level', 3) >= 5), None)
            if vp:
                return f"You have {viral_count} viral post(s). Your top post was on {vp.get('date', '?')}. {vp.get('shap_explanation', 'The key factors were posting time and content format.')}"
        return "No viral posts were detected in your data. Focus on posting reels consistently at the optimal time to increase your chances."

    if 'weak' in q or 'worst' in q or 'bad' in q or 'underperform' in q or 'low' in q:
        if weak_count > 0:
            wp = next((r for r in anomaly if r.get('performance_level', 3) <= 2), None)
            if wp:
                return f"You have {weak_count} underperforming post(s). Your weakest post was on {wp.get('date', '?')}. {wp.get('shap_explanation', 'Common issues include poor timing and low caption engagement.')}"
        return "No critically underperforming posts were found. Your content is performing at an average level across the board."

    if 'trend' in q or 'growing' in q or 'declining' in q or 'direction' in q:
        if trend == 'declining':
            return "Your account shows a declining trend. This means your recent posts are getting less reach than earlier ones. Increase posting frequency and engage with comments quickly to reverse this."
        elif trend == 'growing':
            return "Your account is on a positive growth trend. Keep up the current posting frequency and content style to maintain momentum."
        return "Your account trend is stable -- no significant growth or decline detected. To push growth, experiment with new content formats and posting times."

    if 'engagement' in q or 'rate' in q or 'er' in q:
        avg_er = round(float(session['df_raw']['engagement_rate'].mean()) * 100, 2)
        return f"Your average engagement rate is {avg_er}%. This is calculated as (likes + comments + shares + saves) / reach across all your posts."

    if 'sentiment' in q or 'caption' in q or 'tone' in q or 'writing style' in q or 'arabert' in q:
        arabert = session.get('arabert_results')
        if arabert and arabert.get('available'):
            s = arabert.get('summary', {})
            pos_er = round(float(s.get('positive_avg_er', 0)) * 100, 2)
            neg_er = round(float(s.get('negative_avg_er', 0)) * 100, 2)
            style = s.get('best_writing_style', 'unknown')
            insight = s.get('insight', '')
            return f"Caption analysis: Positive captions average {pos_er}% ER vs {neg_er}% for negative. Best writing style: {style}. {insight}"
        return "No caption sentiment data is available. This usually means your uploaded CSV did not contain caption text."

    # default
    return f"Based on your data: your account trend is {trend}, best posting time is {best_day} at {best_hour:02d}:00, and you have {viral_count} viral and {weak_count} underperforming posts. Ask me about any specific metric for a deeper explanation."


@router.post("/chatbot/{session_id}")
def chat(session_id: str, body: ChatRequest, request: Request):
    """Answer user question using session data as context, via Ollama LLM with rule-based fallback."""
    session = request.app.state.sessions.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")

    context = _build_context(session)
    history_str = _format_history(body.conversation_history)
    sources = _build_sources(session)

    prompt = f"""You are InsightAI, a friendly marketing advisor for small Jordanian businesses on Instagram.
You have access to pre-analyzed data below. Use ONLY this data to answer the user's question.
Do NOT invent numbers or make up data that is not provided below.
Keep your answer concise (3-5 sentences), practical, and easy for a non-technical store owner to understand.

ANALYZED DATA:
{context}
{history_str}

USER QUESTION: {body.question}

Answer in a helpful, direct tone:"""

    start = time.time()
    llm_response = _call_ollama(prompt)
    elapsed_ms = int((time.time() - start) * 1000)

    if llm_response and llm_response.strip():
        answer = llm_response.strip()
        print(f"Ollama chatbot responded in {elapsed_ms}ms")
    else:
        answer = _fallback_answer(body.question, session)
        print("Returning rule-based fallback chatbot answer")

    return {
        'answer': answer,
        'sources_used': sources,
        'generation_time_ms': elapsed_ms,
    }
