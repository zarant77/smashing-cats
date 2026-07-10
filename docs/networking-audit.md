# Multiplayer Networking Audit

## Issues Found

- Local prediction used fixed simulation steps, but the input sequence came from the render frame. If multiple prediction steps ran during one render frame, several simulated commands shared the same sequence, so reconciliation could acknowledge, drop, or replay the wrong movement.
- The web and CLI clients sent only the latest active input. Under batching or stalls, the server did not receive a per-tick command stream, and one-shot actions depended on packet timing.
- The server stored only the latest input and applied it during simulation. It did not keep a sequence-ordered command queue, so duplicate protection and exact `lastProcessedInputSeq` acknowledgements were too coarse.
- Server snapshots included `lastProcessedInputSeq`, but it represented the newest received sequence rather than the exact command processed on that authoritative tick.
- Reconciliation replayed pending inputs, but pending inputs could have duplicate sequence numbers because they were created from render-frame input state instead of fixed simulation commands.
- Remote interpolation used packet receive time as the interpolation timeline. Jitter and packet batching therefore changed visible speed and produced snapshot-dependent stepping.
- Remote interpolation interpolated between buffered packets by arrival time instead of authoritative snapshot ticks.
- Stale snapshot protection was partial. Missing delta bases returned no snapshot, but delayed full or delta snapshots could still rewind the active snapshot store.
- Local visual correction was mixed into the rendered local player snapshot. The predicted simulation state was separate internally, but the rendered snapshot did not make that responsibility obvious to callers.

## Fixes Applied

- Added `PlayerInputCommand` and batched `commands` support to the multiplayer protocol while preserving legacy `input` packet support.
- Added a bounded, sequence-sorted authoritative input queue to core player state.
- Changed server input handling to enqueue commands, ignore duplicates and stale sequences, and process one command per simulation tick.
- Changed authoritative `lastProcessedInputSeq` updates to acknowledge the exact command consumed by that tick.
- Changed local prediction to create strictly increasing commands on fixed prediction ticks, keep a bounded pending queue, and replay only unacknowledged commands after reconciliation.
- Changed clients to resend a bounded rolling window of pending commands instead of only the latest render-frame input.
- Changed interpolation to sort snapshots by authoritative tick and render against an estimated server tick with adaptive delay.
- Added capped velocity-based extrapolation for remote players and entities when the interpolation point runs past the newest snapshot.
- Added stale full/delta snapshot guards in `SnapshotStore`.

## Remaining Follow-Ups

- Expose the existing metrics through a development-only overlay if deeper tuning is needed.
- Add the requested automated tests when the test restriction is lifted.
- Tune interpolation delay thresholds after manual two-client validation under artificial latency.
