# Machine learning in Learnvoy

Learnvoy uses four ML features. All of them degrade gracefully: if a model or the embedding API isn't
available, the app falls back to the simple rule-based behaviour it had before.

| Feature | Where you see it | Technique | Code |
|---|---|---|---|
| Smart job matching | Job board match %, job page "Overall fit" | Text embeddings (Gemini `gemini-embedding-001`) + cosine similarity, blended 50/50 with keyword skill matching | `backend/lib/embeddings.js`, `backend/lib/jobMatch.js` |
| Smart search & similar roadmaps | Explore search, "Similar roadmaps" on shared and own roadmaps | Same embeddings: query vs. roadmap vectors (retrieval) | `backend/lib/roadmapSearch.js` |
| Personal memory model | Review → "Your memory model", interval previews on the grade buttons | FSRS‑5 memory model; each member's 19 weights are fitted to their own review history (log-loss, Adam, L2 toward defaults, held-out check) | `backend/lib/fsrs.js`, `backend/lib/memoryModel.js` |
| Quit-risk prediction | Admin dashboard → Machine learning; "Keep your momentum going" nudges | Daily feature snapshots → 14-day-ahead labels → logistic regression (time-based validation), with a 10% holdout group to measure whether nudges help | `backend/lib/quitRisk.js`, `ml/quit_risk/train.py` |

## Quit-risk pipeline

1. **Snapshot** – each day, for every learner active in the last 14 days: days since last active, active
   days, tasks this week vs. last week, focus minutes, card reviews, streak, account age, open/overdue tasks
   and progress.
2. **Label** – 14 days later: `1` if they had no learning activity in those 14 days, else `0`.
3. **Train** – logistic regression on standardised features, balanced classes, L2. Train on older days,
   test on the newest 25%. A model is only used if its test AUC is at least 0.6; until then a hand-set
   baseline scores learners.
4. **Act and measure** – high-risk learners (≥ 60%, `QUIT_RISK_NUDGE`) get a friendly nudge at most once a
   week. A fixed random 10% never get one, so the admin dashboard can compare quit rates (nudged vs. holdout).

The backend does all of this by itself (hourly scheduler: snapshot daily, retrain weekly). To start with
history instead of waiting weeks, use **Admin → Machine learning → Rebuild & train**, or:

```bash
cd backend
npm run ml -- backfill 120     # rebuild 120 days of snapshots from activity history
npm run ml -- train            # train and activate if good enough
```

### Experimenting in Python

```bash
cd backend && npm run ml -- export                       # → ml/data/quit_snapshots.csv (numbers only, no names)
cd ../ml && pip install -r requirements.txt
python quit_risk/train.py data/quit_snapshots.csv quit_risk/model.json
cd ../backend && npm run ml -- import ../ml/quit_risk/model.json
```

The script compares logistic regression with gradient-boosted trees and prints the coefficients (what
drives risk). It exports the logistic regression, which the backend scores with a dot product.

## Settings (backend/.env, all optional)

| Variable | Default | What it does |
|---|---|---|
| `ML_EMBEDDINGS` | on | `0` turns off embeddings (keyword matching only) |
| `GEMINI_EMBED_MODEL` | `gemini-embedding-001` | Embedding model |
| `ML_EMBED_DIMS` | `768` | Vector size |
| `ML_SIM_LOW` / `ML_SIM_HIGH` | `0.55` / `0.85` | Cosine similarity mapped to 0% / 100% fit |
| `QUIT_RISK_NUDGE` | `0.6` | Risk above which a nudge is sent |

## Privacy

Features are computed from activity counts only (no content, names or emails). Exported CSVs contain
numbers only and are ignored by git (`ml/data/`). Members' personal memory weights are 19 numbers stored
with their settings and deleted with their account.
