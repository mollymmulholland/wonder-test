# Wonder Cognitive Geometry and Glyph IR

Status: architecture candidate implemented behind Wonder Mind runtime v1.

## Governing proposition

Wonder models a person, a dyad, and a developmental process as changing, partially observed systems. It does not treat a profile, archetype, projection, or model state as the person. Three-dimensional geometry is an observability surface over a higher-dimensional state; it is never the ontology itself.

This extends the existing Mythos Cognitive Geometry lineage and its three representational channels:

1. latent/vector representation;
2. symbolic geometry;
3. natural-language interpretation.

The new layer adds explicit time, reversible projections, scenario branching, and a formal symbolic intermediate representation.

## Four spaces, kept distinct

| Space | Represents | Must not be mistaken for |
| --- | --- | --- |
| Cognitive process | Which of the 17 Wonder regions were activated, and with what evidence | A scan of the user's mind |
| Human state | A time-indexed, partial estimate of relevant constructs | The person's identity or essence |
| Dyadic field | Observed and unknown properties emerging between two people | A static compatibility score |
| Developmental state | Changes supported by longitudinal evidence | An inevitable future |

Each dimension stores a value or explicit null, confidence, uncertainty, evidence references, observation time, and basis. Unknown values remain unknown. The projection algorithm reweights only available dimensions and emits coverage for every axis.

## Projection discipline

A projection is a versioned matrix from an N-dimensional state into three navigable coordinates. Every rendered point carries:

- the source state hash;
- the projection version;
- axis labels and basis weights;
- axis-level coverage and uncertainty;
- an epistemic note describing what the view does and does not mean.

The initial cognitive-process view uses:

- interiority → relation;
- memory → possibility;
- exploration → governance.

These are navigational axes for the internal God Scope. They are not universal psychological dimensions. New views may be registered without rewriting the source state.

## Time and trajectories

An observed trajectory is an ordered series of state snapshots. Its apparent movement may reflect:

- actual change in a person or dyad;
- new evidence about an unchanged condition;
- contextual variation;
- correction of an earlier model;
- a model-version change.

Wonder therefore labels ordinary trajectory segments `observed_path_not_forecast`. Counterfactual branches are `plausible_branch_not_prediction` unless and until a separately calibrated forecasting model earns a narrower claim.

There is no one-shot romantic-future prediction. Wonder can eventually compare multiple bounded branches, but each must expose evidence needed, uncertainty, horizon, falsification conditions, and causal status.

## Wonder Glyph Language

Wonder Glyph Language is a symbolic intermediate representation (WGL IR), not decoration, encryption, or a replacement for source code. Its purpose is to make recurrent cognitive operations spatially compact while remaining mechanically auditable.

Version 1 defines operators for observation, inference, hypothesis, prediction, judgment, support, counterevidence, alternatives, uncertainty, time, dyad, branching, constitutional boundaries, correction, abstention, claims, evidence references, falsification conditions, and confidence.

Each glyph program has two inseparable layers:

1. canonical abstract syntax tree containing the full semantics;
2. prefix-ordered glyph tokens containing operator, arity, and canonical payload.

Encoding is valid only when decoding reproduces the original semantic hash. The database enforces `source_hash = round_trip_hash` and `reversible = true`. A beautiful mark that cannot expand back into its claim, evidence, confidence, alternatives, time, and boundary status is not valid Wonder code.

The current `E000–E013` codes are registry identifiers. The visual system will map them to Wonder-owned SVG primitives first and, only after semantic stability, to a custom font. This prevents visual design from freezing an immature language.

## Runtime contract

Every completed Wonder Mind inference now persists:

- its structured judgment and admissible evidence;
- an N-dimensional cognitive-process snapshot;
- a versioned 3D projection;
- an observed trajectory when at least two snapshots exist;
- a reversible WGL program for the judgment;
- representation hashes in the inference run and audit record.

Representation persistence is part of successful completion, not optional telemetry. A non-reversible glyph program fails closed.

## Governance gates before expansion

The next language version must pass:

- round-trip semantic equality;
- unknown-operator rejection;
- evidence-reference validity;
- privacy-purpose checks for every operand;
- model-version and projection-version compatibility;
- correction and supersession tests;
- ambiguity tests across independent decoders;
- accessibility fallback to natural language;
- red-team tests against deterministic or diagnostic interpretations of geometry.

Consumer interfaces should continue to receive calm natural-language explanations. Geometry and glyphs remain an internal research, engineering, and governance instrument until comprehension, privacy, and epistemic-safety testing supports a bounded consumer use.
