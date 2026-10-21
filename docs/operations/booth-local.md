# Local booth candidate and field evidence

This is an engineering handoff for the existing Energy Catch MVP. A local package is not a certified booth release. Direction A, game rules and P1/P2 assets remain unchanged. Actual camera accuracy, target-laptop performance, TV readability and final input-scheme choice require physical evidence and human acceptance.

## Prepare a portable candidate

Use the existing installed dependencies to build; packaging does not install anything or publish:

```sh
npm test
npm run build
node scripts/package-booth.mjs /absolute/path/to/a-new-output-folder
```

The output directory must not already exist and must be outside `dist`, including through directory aliases. Packaging verifies copied bytes with SHA-256. `PACKAGE-MANIFEST.json` covers all payload files except itself. Partial output is retained if an error occurs; choose a new destination for a retry.

Transfer the entire output directory to the booth laptop. It contains the local model/WASM files, static assets, a Node standard-library server and `START-BOOTH.txt`. Node.js22.18+ is needed; the Cloud run used24.19.0. Windows execution of the new packaging/server scripts has not been measured.

```sh
cd /path/to/output-folder
node serve.mjs
```

Open http://127.0.0.1:4173/ in Chrome/Edge. Stop with Ctrl+C. For another port: `node serve.mjs . 5000`. The server binds only to127.0.0.1, serves GET/HEAD requests and does not list directories or permit writes. Use localhost rather than opening `index.html` as a file. Camera remains opt-in; use keyboard fallback if tracking cannot meet the safety deadline.

No public deployment, Git commit/push, final art approval or human release acceptance is performed by these commands.

## Run existing browser checks

Playwright must already be available externally or in the caller's normal module resolution. It is not added as a project dependency. Supply the existing `node_modules` directory as the fourth argument. `CHROMIUM_EXECUTABLE_PATH` optionally selects an already installed Chromium/Chrome/Edge executable; no browser is downloaded.

```sh
node tests/browser/results-controls-smoke.mjs /tmp/results-controls http://127.0.0.1:4173 /existing/node_modules
node tests/browser/pose-calibration-smoke.mjs /tmp/pose-calibration http://127.0.0.1:4173 /existing/node_modules
node tests/browser/pose-recovery-smoke.mjs /tmp/pose-recovery http://127.0.0.1:4173 /existing/node_modules
node tests/browser/hand-movement-smoke.mjs /tmp/hand-movement http://127.0.0.1:4173 /existing/node_modules
node tests/browser/camera-lifecycle-smoke.mjs /tmp/camera-lifecycle http://127.0.0.1:4173 /existing/node_modules
node tests/browser/pose-sdk-smoke.mjs /tmp/real-sdk http://127.0.0.1:4173 /existing/node_modules
node tests/browser/endurance-smoke.mjs /tmp/endurance http://127.0.0.1:4173 /existing/node_modules
```

Run browser suites sequentially to reduce host contention. Endurance defaults to ten fresh-page camera start/stop cycles followed by ten real60-second rounds across five two-round sessions. `--cycles-only` skips the full rounds. Camera/bitmap/worker are simulated in those suites; only the separately labeled SDK probe uses actual model inference, on synthetic video without people. Neither substitutes for the physical field matrix. Browser screenshots may themselves cause capture gaps on a slow automation host; retain failures rather than loosening the250ms Pose deadline.

## Record and check actual field evidence

Follow [FIELD-01](../reports/master-v3-2026-10-19/FIELD-01.md). Copy its two CSV templates for a new run; do not overwrite historical observations or invent values. Use namespace `MASTER-V3`. Correlate metrics and observations by `test_id`, `run_id` and `scheme`. Status is `MEASURED`, `PASS` or `FAIL`; a typed PASS never replaces measurement fields. Include consent reference, timing method/resolution and evidence path. The validator does not open camera recordings.

```sh
node scripts/field-evidence.mjs observations.csv metrics.csv field-summary.json
```

Exit0 means the supplied rows meet the checked numeric thresholds. Exit2 means incomplete evidence or thresholds not met; exit1 is an input/CSV error. All outcomes keep physical acceptance `PENDING_HUMAN`. Empty templates deliberately return INCOMPLETE. Near-distance data below2m remains diagnostic and cannot establish the>=2m accuracy requirement. Precision/recall with zero denominators is undefined.

The checker covers precision>=90%, recall>=85%, zero silent reassignment, neutral-after-loss<=250ms, render FPS p5>=45 and the body-to-robot p95<=200ms target. It does not certify measurement authenticity, complete lighting/distance/participant coverage, TV readability, actual network disconnection, endurance or final scheme selection. Preserve timing uncertainty when interpreting values at a threshold.
