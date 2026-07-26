# InsightAI

AI-powered analytics dashboard for Instagram content performance. Upload a Meta
Business Suite CSV export and get anomaly detection, engagement forecasting,
a post-performance simulator, and an AI marketing plan — all explained in
plain language by a local LLM (Qwen2.5).

## Features

- **Analytics** — engagement rate, reach rate, health score, and other KPIs
  benchmarked against your account's content category, plus an anomaly
  detection table (viral spikes, underperforming posts) with SHAP-based
  explanations for each flagged post.
- **Insights** — a 7-day engagement forecast (Prophet) with a seasonality
  breakdown, and an AI-generated one-month (4-week) marketing plan tailored
  to your account's actual data.
- **Simulate** — predict the engagement rate of a hypothetical post before
  you publish it, with a breakdown of which features (post hour, caption
  length, media type, etc.) help or hurt.
- **Chatbot** — ask free-form questions about your account's performance;
  answers are grounded strictly in your analyzed data and reply in whichever
  language you ask in.

## Architecture

```
INSIGHT_AI/
├── backend/            FastAPI server
│   ├── main.py         App entrypoint, loads all ML models on startup
│   ├── routers/        upload, analytics, insights, simulate, chatbot
│   └── services/
├── modules/            ML pipeline (isolation forest, DNN, Prophet, AraBERT)
├── models/              Pre-trained model artifacts
├── frontend/            Next.js (App Router) + Tailwind UI
│   └── src/
│       ├── app/          One route per page (analytics, insights, simulate, chatbot)
│       ├── components/   Sidebar, PageHeader, CircularProgress, LockedPage
│       └── context/       SessionContext — holds the active upload session
└── requirements.txt
```

**Data flow:** CSV upload → `backend/routers/upload.py` runs it through the
four ML modules in `modules/` → results are cached in-memory per session →
each page (`analytics`, `insights`, `simulate`, `chatbot`) fetches from its
matching router using the `session_id`.

## Prerequisites

- Python 3.11
- Node.js 18+
- [Ollama](https://ollama.com) installed locally, with a Qwen2.5 model pulled
  (e.g. `qwen2.5:7b-instruct-q4_K_M`) — used for the chatbot and marketing
  plan generation

## Running locally

You'll need **three things running at once**: Ollama, the backend, and the
frontend.

**1. Start Ollama** (usually runs in the background once launched — confirm
with `ollama list`).

**2. Backend** — from the project root:
```bash
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
```
Wait for `InsightAI: all models ready.` before continuing.

**3. Frontend** — in a second terminal:
```bash
cd frontend
npm install
npm run dev
```

**4.** Open [http://localhost:3000](http://localhost:3000), upload a CSV
exported from Meta Business Suite (Insights → Content → Export), and explore.

## Tech stack

- **Backend:** FastAPI, scikit-learn (Isolation Forest), TensorFlow/Keras (DNN),
  Prophet, Hugging Face Transformers (AraBERT sentiment), Ollama (Qwen2.5)
- **Frontend:** Next.js, React, TypeScript, Tailwind CSS

## Notes

- Data is processed locally — nothing is sent to a third-party API. The LLM
  runs on your machine via Ollama.
- Sessions are held in-memory only; restarting the backend clears all
  uploaded data (re-upload to continue).
