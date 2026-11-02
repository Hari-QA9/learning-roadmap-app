// Machine-learning helper commands (run from the backend folder):
//   npm run ml -- backfill [days]        rebuild quit-risk snapshots from activity history and label them
//   npm run ml -- train                  train the quit-risk model (logistic regression) and use it if it's good enough
//   npm run ml -- export [file.csv]      write labelled snapshots to CSV for ml/quit_risk/train.py
//   npm run ml -- import <model.json>    load a model trained in Python and make it the active one
//   npm run ml -- embed-jobs             compute meaning vectors for job posts that don't have one yet
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const QR = require('../lib/quitRisk');

(async () => {
  const [cmd, arg] = process.argv.slice(2);
  try {
    if (cmd === 'backfill') {
      console.log(await QR.backfill(parseInt(arg, 10) || 120));
    } else if (cmd === 'train') {
      const r = await QR.trainFromDb();
      console.log(r.accepted ? 'Model trained and activated.' : `Kept the current model: ${r.reason}`);
      if (r.metrics) console.log(JSON.stringify(r.metrics, null, 2));
    } else if (cmd === 'export') {
      const file = arg || path.join(__dirname, '..', '..', 'ml', 'data', 'quit_snapshots.csv');
      const rows = await QR.labelledRows();
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, [['day', ...QR.FEATURES, 'label'].join(','), ...rows.map((r) => [r.day, ...QR.FEATURES.map((k) => r.f[k]), r.y].join(','))].join('\n') + '\n');
      console.log(`Wrote ${rows.length} labelled snapshots to ${file} (no names or emails — just numbers).`);
    } else if (cmd === 'import') {
      const model = JSON.parse(fs.readFileSync(arg, 'utf8'));
      const ok = Array.isArray(model.features) && model.features.every((f) => QR.FEATURES.includes(f)) && model.coef.length === model.features.length && model.mean.length === model.features.length;
      if (!ok) throw new Error('This file is not a quit-risk model (features/coef/mean/scale/intercept).');
      await QR.saveModel(model, model.metrics);
      console.log(`Imported ${model.version || 'model'} and made it active.`);
    } else if (cmd === 'embed-jobs') {
      console.log(`Embedded ${await require('../lib/jobMatch').embedMissingJobs(2000)} job posts.`);
    } else {
      console.log('Commands: backfill [days] | train | export [file.csv] | import <model.json> | embed-jobs');
    }
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  }
  process.exit();
})();
