---
name: reactor-rush-stitch-design
description: Use when auditing existing Reactor Rush Stitch screens or planning separately approved visual production in Stitch.
---

# Reactor Rush Stitch design and audit

## Trigger

Use for a read-only review of the existing Reactor Rush Stitch project, reconciling Stitch screen concepts with local design/runtime status, or a separately approved Stitch visual-production task.

## Required inputs

- The project identity or user-provided Stitch project URL.
- The task's approved work package, allowed actions, and target screen(s).
- [DESIGN.md](../../../DESIGN.md), [ART_BIBLE.md](../../../ART_BIBLE.md), and [visual production roadmap](../../../docs/design/visual-production-roadmap.md) for current direction/status.
- The [screen flow and round map](../../../docs/design/screen-flow-and-round-map.md) when reviewing screen hierarchy.

If the project, target, or authority is ambiguous, report the ambiguity and use read-only observation only. Do not infer approval from a visible browser tab or project access.

## WP-01: read-only audit

WP-01 authorizes inspection only. Identify the project by URL/ID and record which screens, frame names, frame dimensions, status labels, and exports are actually visible. Distinguish a canvas/frame's actual dimensions from text inside its design and distinguish preview dimensions from export dimensions. Reconcile observed content against the local roadmap and label each item as a concept, runtime-integrated item, or unverified.

Do not create, edit, duplicate, rename, export, publish, or delete Stitch content. Do not treat an unavailable login/session as permission to automate authentication. If the project is inaccessible, report `BLOCKED`, the exact visible failure, and which facts remain unverified. A missing observation is not a pass.

## WP-02: visual production

Any Stitch canvas changes, new screens, exports, or publishing belong to WP-02 and require separate explicit human approval. Before that approval, prepare only a proposal or read-only findings. Once approved, confirm the exact target, frame list, dimensions, deliverables, and allowed write actions; preserve accepted screens and keep changes limited to the approved scope. Never publish or export beyond the approved deliverables.

## Evidence and acceptance

Return project URL/ID, observation timestamp, screen/frame names, dimensions and how each was read, concept/runtime status, evidence references, inaccessible items, and unresolved discrepancies. Report tool observations separately from local documentation. Never call a concept a production screen or a frame label verified export dimensions.

Automated link checks are automated verification; the operator's interpretation is self-review. Independent evaluation requires an actual distinct reviewer. Do not claim it from a screenshot, successful script, or the implementer's own audit.
