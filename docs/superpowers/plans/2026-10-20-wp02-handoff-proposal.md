# WP-02 concrete handoff proposal — pending access and review

Status: PREPARED / NOT EXECUTED. This proposal does not approve final artwork, invent a field-tested camera default, or certify any editor/export dimensions. No Stitch tool is advertised in the current Cloud session. The uploaded reconstructed roadmap could not be downloaded because attachment-directory creation returned EROFS; its contents have not been read.

Authority: [WP-02 specification](../specs/2026-10-17-reactor-rush-wp-02-stitch-visual-production.md), [DESIGN](../../../DESIGN.md), [Art Bible](../../../ART_BIBLE.md), [screen flow](../../design/screen-flow-and-round-map.md), and [camera integration](../../gameplay/camera-input-integration.md).

## Proposed amendment for the current implementation

The original visual specification excludes webcam, while the current implemented MVP has optional Solo/Co-op camera setup and an in-game PiP dock. Before external authoring, review the following limited amendment: represent existing optional camera setup/status/STOP/CALIBRATE and Solo mode faithfully, retain keyboard fallback, and add no new tracking scheme or model. This is an amendment proposal, not a claim of historical approval.

Keep the existing runtime palette provisionally for consistency; do not lock a new token set. Direction A silhouettes, rigs and Idle/Move/Catch/Activate definitions remain unchanged. No new Win/Confused animation is authorized by this handoff. Final art-token and booth-scheme choices remain human decisions.

## Target and outputs

Proposed existing project: https://stitch.withgoogle.com/projects/7998219093435398329 . This ID is from the local roadmap, not fresh tool observation. G0 must confirm the correct project, current frame inventory and permissions before a shared-project write. Existing frame IDs are UNKNOWN; never substitute invented IDs.

| Item | Proposed frame name | Required contents | Acceptance evidence |
|---|---|---|---|
| S01 | RR-WP02-S01-Start-Candidate | Energy Catch, existing Solo/Co-op choices, Enter/start, optional camera entry; preserve P1/P2 | Editor frame1280×720, source identity, copy parity and viewport review |
| S02 | RR-WP02-S02-HUD-Candidate | Existing score/timer/combo and two lanes; current optional PiP/control status; no new gameplay fields | Editor dimensions; PiP does not obscure falling items or timer; text/state mapping and reduced-motion review |
| S03 | RR-WP02-S03-Results-Candidate | Co-op scorecard, runtime-value placeholders, restart; SAMPLE DATA and VFX CONCEPT labels | Correct scoring semantics, no invented winner/reward, storyboard/reduced-motion alternative |
| S04 | RR-WP02-S04-Round-Map-Concept | Energy Catch Playable MVP; Duo Circuit/Cool the Core Conditional / concept; Final Boss Future placeholder | Exact availability labels; later modes visibly unavailable; no implied launch/progression |
| ART-01 | RR-WP02-ART01-Lab-Concept | Lab layers, reactor, current energy/hazard category studies; lightweight proposals | Layer/occlusion inventory, source/editability, dimensions and concept labels |
| ENV-01 | RR-WP02-ENV01-World-Concept | Current lab anchor and clearly conditional/future environments | No mechanics invented; separate editor/capture/export dimensions |

These are proposed names only, not observed frames. Preserve all existing alternatives; identify canonical/superseded frames through review rather than deleting them.

## Serialized execution and evidence

1. Read-only G0: confirm project and frame IDs; record editor dimensions, ownership and baseline captures. If access is unavailable, record BLOCKED with the actual failure.
2. Review the amendment, frame list and provisional palette treatment against current gameplay/camera controls. Obtain the specific WP-02 implementation disposition required by the existing project workflow.
3. Author only the approved frames, one shared-canvas write at a time. Keep source editable. No publishing.
4. Verify1280×720 in the editor; record raster capture/export dimensions separately. Inspect a proportional1920×1080 preview, safe areas, text and controls. A screenshot is not a target-TV test.
5. Export only explicitly approved review formats to a separate evidence directory. Never place a concept export into runtime asset paths or update manifests by implication.
6. Hand off each item with source/frame IDs, status, dimensions, hash, external-resource disclosures, ownership, review findings and human disposition. Keep external-tool evidence distinct from local documentation.

## WP-03 prerequisites

Runtime art integration needs accepted assets with editable source, exact export path/format/dimensions/alpha, anchor/pivot, ownership terms and updated review disposition. The current manifest's Draft/In review entries do not satisfy final art approval. Any accepted integration task must specify its exact paths and preserve scoring, timer, input safety and rig contracts.

No round2 implementation can begin from visual boards alone. It needs an approved mechanics brief defining objective, controls, scoring, timer, transitions, failure conditions and acceptance tests. Conditional round names are not that brief.
