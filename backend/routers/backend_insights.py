import json
import time
import requests
from typing import List
from pydantic import BaseModel
from fastapi import APIRouter, Request, HTTPException

router = APIRouter()

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "qwen2.5:7b-instruct-q4_K_M"


class MarketingPlanRequest(BaseModel):
    plan_duration_weeks: int = 4
    account_goals: List[str] = []


def _count_levels(anomaly_results):
    """Count posts at each performance level 1-5."""
    counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for r in anomaly_results:
        lvl = r.get('performance_level', 3)
        counts[lvl] = counts.get(lvl, 0) + 1
    return counts


def _call_ollama(prompt, timeout=150):
    """Send prompt to Ollama and return response text. Returns None on any failure."""
    try:
        resp = requests.post(
            OLLAMA_URL,
            json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
            timeout=timeout
        )
        resp.raise_for_status()
        return resp.json().get('response', '')
    except Exception as e:
        print(f"Ollama call failed: {e}")
        return None


def _fallback_plan(prophet_results, level_counts, plan_weeks):
    """Rule-based plan when Ollama is unavailable."""
    best_day = prophet_results.get('best_day', 'Friday')
    best_hour = prophet_results.get('best_hour', 6)
    trend = prophet_results.get('trend_direction', 'stable')
    underperforming = level_counts.get(1, 0) + level_counts.get(2, 0)
    viral = level_counts.get(5, 0)

    plan = []
    for w in range(1, plan_weeks + 1):
        actions = [
            {"type": "Schedule", "action": f"Post 3 reels on {best_day} at {best_hour:02d}:00", "priority": "high"},
            {"type": "Content", "action": "Use positive-tone Arabic captions with a clear call-to-action", "priority": "high"},
        ]
        focus = "Consistency and steady posting"
        if w == 1 and underperforming > 3:
            focus = "Diagnose what's underperforming"
            actions.append({"type": "Review", "action": "Audit your 5 lowest-performing posts and identify common caption and timing patterns", "priority": "medium"})
        if w == 2 and viral > 0:
            focus = "Double down on what's working"
            actions.append({"type": "Content", "action": f"Recreate the format and caption style of your {viral} viral post(s)", "priority": "high"})
        if trend == 'declining':
            focus = "Recover engagement momentum"
            actions.append({"type": "Engagement", "action": "Reply to all comments within 2 hours of posting to boost early engagement signals", "priority": "medium"})
        if w == plan_weeks:
            focus = "Review results and plan next month"
            actions.append({"type": "Review", "action": "Compare this month's engagement rate against the start of the month and note what changed", "priority": "medium"})
        plan.append({"week": w, "focus": focus, "actions": actions})

    summary = f"Your account has {underperforming} underperforming posts out of {sum(level_counts.values())} total. Prioritize posting consistently on {best_day}s at {best_hour:02d}:00."
    if trend == 'declining':
        summary += " A declining trend was detected -- posting frequency and engagement speed are the priority fixes."
    elif trend == 'growing':
        summary += " The account shows a positive growth trend -- maintain current momentum."

    return plan, summary


@router.get("/prophet/{session_id}")
def get_prophet(session_id: str, request: Request):
    """Return Prophet trend forecasting results from session."""
    session = request.app.state.sessions.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    return session['prophet_results']


@router.get("/sentiment/{session_id}")
def get_sentiment(session_id: str, request: Request):
    """Return AraBERT caption sentiment results. Returns unavailable if not yet run."""
    session = request.app.state.sessions.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")

    arabert_results = session.get('arabert_results')
    if arabert_results is None:
        return {
            "available": False,
            "message": "Caption sentiment analysis not yet run. AraBERT module coming soon."
        }
    return arabert_results


@router.post("/marketing-plan/{session_id}")
def get_marketing_plan(session_id: str, body: MarketingPlanRequest, request: Request):
    """Generate a weekly marketing plan via Ollama LLM, with a rule-based fallback."""
    session = request.app.state.sessions.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")

    prophet_results = session['prophet_results']
    anomaly_results = session['anomaly_results']
    df_raw = session['df_raw']
    meta = session['meta']

    plan_weeks = max(1, min(body.plan_duration_weeks, 8))
    level_counts = _count_levels(anomaly_results)

    avg_er = round(float(df_raw['engagement_rate'].mean()) * 100, 2)
    best_day = prophet_results.get('best_day', 'Friday')
    best_hour = prophet_results.get('best_hour', 6)
    trend = prophet_results.get('trend_direction', 'stable')
    goals_str = ', '.join(body.account_goals) if body.account_goals else 'improve overall performance'

    prompt = f"""You are InsightAI, a marketing advisor for small Jordanian businesses on Instagram.

Follow these rules exactly, with no exceptions:

1. LANGUAGE: Write the entire plan (summary, action types, and every action) in the SAME language as the account's goals text below. If the goals are in Arabic, write the whole plan in Arabic. If they're in English, write it in English. If goals are empty or mixed, default to English. Never mix languages within the plan.
2. GROUNDING: Base every recommendation strictly on the ACCOUNT DATA below. Never invent metrics, dates, or facts not given here.
3. LOGICAL CONSISTENCY: Do not contradict yourself between weeks (e.g. don't recommend "reduce posting frequency" in Week 1 and "post more often" in Week 2 without an explicit, stated reason tied to the data). Each week should build logically on the previous one.
4. ONE-MONTH STRUCTURE: This is a {plan_weeks}-week plan meant to cover one full month. Each week must have a clear, distinct focus (e.g. Week 1: fix what's underperforming, Week 2: double down on what's working, Week 3: consistency and engagement speed, Week 4: review and plan next month) — adapt the focus to what the actual data shows, don't just reuse this example structure verbatim.
5. SPECIFICITY: Every action must be concrete and immediately doable (a specific day/time, a specific content type, a specific number) — never vague advice like "post more" or "engage with your audience" on its own.
6. PRIORITY: Mark each action "high", "medium", or "low" based on expected impact given the data, not arbitrarily.
7. OUTPUT FORMAT: Respond with ONLY valid JSON, no markdown fences, no commentary before or after it.

ACCOUNT DATA:
- Account: {meta.get('account_name', 'unknown')}
- Engagement Rate: {avg_er}%
- Trend: {trend}
- Best posting time: {best_day} at {best_hour:02d}:00
- Viral posts: {level_counts.get(5, 0)}, Underperforming posts: {level_counts.get(1, 0) + level_counts.get(2, 0)}
- Goals: {goals_str}

Generate the {plan_weeks}-week (one month) plan as this exact JSON shape:
{{
  "plan": [
    {{
      "week": 1,
      "focus": "short phrase naming this week's theme",
      "actions": [
        {{"type": "Schedule", "action": "specific actionable step", "priority": "high"}}
      ]
    }}
  ],
  "summary": "one paragraph explaining the overall month-long strategy and how the weeks connect"
}}"""

    start = time.time()
    llm_response = _call_ollama(prompt)
    elapsed_ms = int((time.time() - start) * 1000)

    if llm_response:
        try:
            clean = llm_response.strip()
            # strip markdown code fences if the model wraps output
            if '```' in clean:
                parts = clean.split('```')
                for part in parts:
                    part = part.strip()
                    if part.startswith('json'):
                        part = part[4:].strip()
                    if part.startswith('{'):
                        clean = part
                        break
            parsed = json.loads(clean)
            print(f"Ollama plan generated in {elapsed_ms}ms")
            return {
                'plan': parsed.get('plan', []),
                'summary': parsed.get('summary', ''),
                'generated_by': OLLAMA_MODEL,
                'generation_time_ms': elapsed_ms,
            }
        except Exception as e:
            print(f"LLM JSON parse failed: {e} -- switching to fallback")

    plan, summary = _fallback_plan(prophet_results, level_counts, plan_weeks)
    print(f"Returning rule-based fallback plan")
    return {
        'plan': plan,
        'summary': summary,
        'generated_by': 'rule-based-fallback',
        'generation_time_ms': elapsed_ms,
    }
