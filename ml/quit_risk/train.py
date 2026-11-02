"""Train Learnvoy's quit-risk model in Python (scikit-learn) and export it for the backend.

    cd backend && npm run ml -- export            # writes ml/data/quit_snapshots.csv (numbers only)
    cd ../ml && pip install -r requirements.txt
    python quit_risk/train.py data/quit_snapshots.csv quit_risk/model.json
    cd ../backend && npm run ml -- import ../ml/quit_risk/model.json

The backend already retrains a logistic regression every week by itself. This script is for
exploring: it uses the same time-based split, compares logistic regression with gradient-boosted
trees, prints what drives risk, and exports the logistic regression (the backend scores it with a
dot product, so no Python is needed in production).
"""
import json
import sys
from datetime import date

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import log_loss, roc_auc_score
from sklearn.preprocessing import StandardScaler

FEATURES = [
    "days_since_active", "active_days_14", "tasks_7d", "tasks_prev_7d", "focus_minutes_7d",
    "reviews_7d", "streak", "account_age_log", "open_tasks_log", "overdue_tasks_log", "progress_pct",
]


def precision_top(y, p, share=0.2):
    k = max(1, int(round(len(p) * share)))
    idx = np.argsort(-p)[:k]
    return float(np.mean(np.asarray(y)[idx]))


def main(src, out):
    df = pd.read_csv(src).sort_values("day")
    if len(df) < 200 or df.label.sum() < 20 or (1 - df.label).sum() < 20:
        sys.exit(f"Not enough labelled data yet ({len(df)} rows, {int(df.label.sum())} quit). Keep collecting.")
    # Time-based split: train on older days, test on the newest 25% — like using it for real.
    cut = df.day.iloc[int(len(df) * 0.75)]
    train, test = df[df.day < cut], df[df.day >= cut]
    Xtr, ytr, Xte, yte = train[FEATURES].values, train.label.values, test[FEATURES].values, test.label.values

    scaler = StandardScaler().fit(Xtr)
    logreg = LogisticRegression(class_weight="balanced", C=1.0, max_iter=2000).fit(scaler.transform(Xtr), ytr)
    p_lr = logreg.predict_proba(scaler.transform(Xte))[:, 1]
    gbt = HistGradientBoostingClassifier(max_depth=3, learning_rate=0.05, max_iter=300, class_weight="balanced").fit(Xtr, ytr)
    p_gb = gbt.predict_proba(Xte)[:, 1]

    print(f"train {len(train)} rows · test {len(test)} rows (from {cut}) · quit rate {yte.mean():.1%}")
    for name, p in [("logistic regression", p_lr), ("gradient-boosted trees", p_gb)]:
        print(f"  {name:24s} AUC {roc_auc_score(yte, p):.3f}  log-loss {log_loss(yte, p):.3f}  precision@top20% {precision_top(yte, p):.1%}")
    print("What pushes risk up (+) or down (−), per standard deviation:")
    for f, c in sorted(zip(FEATURES, logreg.coef_[0]), key=lambda x: -abs(x[1])):
        print(f"  {f:20s} {c:+.3f}")

    model = {
        "kind": "logreg", "version": f"sklearn-logreg-{date.today().isoformat()}", "features": FEATURES,
        "mean": scaler.mean_.tolist(), "scale": scaler.scale_.tolist(),
        "coef": logreg.coef_[0].tolist(), "intercept": float(logreg.intercept_[0]),
        "metrics": {
            "auc": float(roc_auc_score(yte, p_lr)), "logloss": float(log_loss(yte, p_lr)),
            "precision_top20": precision_top(yte, p_lr), "base_rate": float(yte.mean()),
            "n": int(len(test)), "train_n": int(len(train)), "split_day": str(cut),
            "gbt_auc": float(roc_auc_score(yte, p_gb)),
        },
    }
    with open(out, "w") as fh:
        json.dump(model, fh, indent=2)
    print(f"Saved {out}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("usage: python quit_risk/train.py <snapshots.csv> <model.json>")
    main(sys.argv[1], sys.argv[2])
