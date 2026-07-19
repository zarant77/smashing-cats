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
- Grounded reconciliation returned before horizontal smoothing, so every correction larger than 0.5 world units snapped the local cat directly to the authoritative X position.
- Predicted movement was rendered only on fixed 60 Hz ticks. High-refresh displays therefore showed duplicate frames followed by a full-tick position step.
- The server consumed one old command per tick after a delayed batch. Because it had already simulated the network gap using the last known held state, this built an artificial input backlog and made acknowledgements diverge from the movement already simulated.
- The server used `setInterval(1000 / 60)` as if every timer callback were a simulation tick. Node can schedule that fractional delay at roughly 16 ms, allowing the authoritative simulation to run faster than 60 Hz.
- Every render frame resent the entire unacknowledged input window even though WebSocket delivery is reliable and ordered, creating avoidable parsing, allocation, and bandwidth pressure.
- Stale snapshots were rejected internally but returned as the current snapshot, so callers inserted the current state into the interpolation buffer again with a fresh receive time.
- New packet arrivals re-anchored the estimated server clock even when a packet was late, which could move the remote render timeline backwards.

## Fixes Applied

- Added `PlayerInputCommand` and batched `commands` support to the multiplayer protocol while preserving legacy `input` packet support.
- Added a bounded, sequence-sorted authoritative input queue to core player state.
- Changed server input handling to enqueue commands, ignore duplicates and stale sequences, then coalesce each arrived batch to its freshest held state while preserving jump edges.
- Changed authoritative `lastProcessedInputSeq` updates to acknowledge the exact command consumed by that tick.
- Changed local prediction to create strictly increasing commands on fixed prediction ticks, keep a bounded pending queue, and replay only unacknowledged commands after reconciliation.
- Changed clients to batch newly generated fixed-tick commands and send each command once over the reliable, ordered WebSocket.
- Changed interpolation to sort snapshots by authoritative tick and render against an estimated server tick with adaptive delay.
- Added capped velocity-based extrapolation for remote players and entities when the interpolation point runs past the newest snapshot.
- Added stale full/delta snapshot guards in `SnapshotStore`.
- Acknowledged the newest command consumed by each authoritative server tick, so reconciliation drops exactly the input already represented by the snapshot.
- Replaced callback-counted server updates with an elapsed-time fixed-step clock, including bounded catch-up after an event-loop stall.
- Kept local horizontal corrections visually continuous on the ground and added sub-tick predicted rendering for 90/120 Hz displays.
- Made stale snapshot rejection explicit to callers and prevented duplicate samples from receiving artificial arrival timestamps.
- Added a monotonic, rate-corrected interpolation clock so late snapshots and adaptive delay changes cannot rewind visible motion.
- Reset prediction timing and queued movement across pause/resume, and preserved quick jump taps that occur between render frames.
- Added regression tests for server timing, delayed input batches, stale packets, pause/resume, sub-tick motion, reconciliation, one-time sends, and late snapshot arrival.
- Connected the existing development-only latency and jitter controls to both outgoing input and incoming snapshots for repeatable browser validation.

## Remaining Follow-Ups

- Tune interpolation delay thresholds only if production telemetry shows that the current 45–160 ms adaptive window is too narrow for a target region.
