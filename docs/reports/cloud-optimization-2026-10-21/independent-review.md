# Independent evaluation — optimization research

Reviewer: distinct read-only agent `/root/camera_audit`.

**PASS for research methodology and report consistency. G2 remains BLOCKED. This is not shipping, release or physical acceptance.**

The reviewer inspected benchmark sources and raw JSON, recomputed aggregates, verified both source hashes and confirmed194/194 entry-file hashes unchanged. It verified30complete trials, six individual suites below120s and433.372s combined. Experimental reductions recompute to85.1491%synthetic environmentCPU,41.9857%SDK environmentCPU and83.1233%startup first-fresh-result latency. Startup medians are6884.65ms versus1161.90ms using0≤age<250ms. Canvas's492.7ms late result and nondeterministic failures remain explicit.

Findings and corrections:

- Exploratory ablation did not count blockedGLdraws or save initial calibration state. Subsequent harness/version adds both; original rawdata and its limits are retained.
- Incomplete-suite success status was possible in the initial harness. Current scripts return nonzero for incomplete/aborted results and preserve partialdata.
- Quantile convention and whole-cgroupCPU scope are now explicit; additive8ms timer intervention is not described as every possible timer scheduler.
- A P2 summary issue represented unmeasured SDK capture-gap counts as0. Corrected to`null` plus`NOT_MEASURED_BY_THIS_SUMMARY`; reviewer confirmed closure. Synthetic observed counts remain intact.
- Startup SDKready and firstresult are not usable controls. Firstfreshresult derives from raw age and still proves no body/calibration readiness.

No remaining blocking research-report finding was reported. Review limits: read-only source, hashes, artifacts and numerical recomputation; no independent browser/model benchmark or regression execution this round. Automated173test verification and the implementer's self-review are separate evidence. Renderer/delegate policy remains an ARC-dependent opportunity outside current product shipping scope.
