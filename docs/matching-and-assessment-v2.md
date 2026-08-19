# Wonder Assessment + Matching Architecture v2

## Core rule
Archetypes are a narrative interpretation layer. They are not the underlying measurement model and they should not directly determine matches.

The pipeline is:

1. Intake + hard constraints
2. Questionnaire responses
3. Dimension-level person model
4. Confidence/evidence model
5. Archetype interpretation (primary + secondary)
6. Compatibility scoring against another person's dimension model
7. Human-readable rationale

## Why v1 was insufficient
The preview model attached broad tags directly to answer choices and counted overlaps with archetype keyword sets. That makes individual questions overly consequential, encourages binary/reductive prompts, and makes the matching rationale hard to defend.

V2 separates measurement from storytelling.

## Person-model domains

### Cognitive style
- systemizing
- contextual/nuance sensitivity
- ambiguity tolerance
- decisiveness

### Temperament / lifestyle orientation
- novelty orientation
- social initiation
- emotional intensity
- structure preference

### Relationship needs and interaction style
- autonomy need
- closeness need
- reassurance need
- vulnerability openness
- conflict directness
- repair orientation
- reciprocity sensitivity
- baseline trust

### Values
- family
- achievement
- meaning
- freedom
- stability
- knowledge
- service
- influence
- beauty
- loyalty

### Identity needs
- recognition
- competence identity
- distinctiveness
- belonging

### Stress responses
- control
- withdrawal
- accommodation
- intellectualization

None of these variables are diagnoses. Wonder should describe them as tendencies, preferences, or hypotheses and update them with additional evidence.

## Questionnaire design rules

1. Every question must have a named measurement purpose before it is added.
2. Avoid false binaries unless the tradeoff itself is the construct being measured.
3. Use multiple formats: single choice, Likert scales, multi-select, rank ordering, scenarios, and later free-text evidence.
4. No important dimension should depend on one item.
5. Repeat constructs through different contexts to estimate consistency.
6. Do not make ambition, marriage, family, independence, extroversion, or any other founder-specific preference universal.
7. Answers can affect several dimensions with different weights.
8. Maintain an evidence count and confidence estimate for every inferred dimension.
9. Contradictions are useful data; do not forcibly collapse them into one answer.
10. The UI should allow 'both', 'depends', or graded responses when that is psychologically meaningful.

## Archetypes

Current narrative prototypes:
- Architect
- Seer
- Explorer
- Sovereign
- Alchemist
- Devotee
- Guardian
- Maverick

An archetype is inferred by similarity between a user's dimension vector and a prototype vector. Wonder returns primary and secondary archetypes plus confidence and should allow blended profiles.

Archetypes should never be presented as immutable identities.

## Matching

### Step 1: eligibility / hard constraints
Examples:
- compatible relationship structure
- compatible relationship intention
- children/family-plan conflicts
- later: age, geography, orientation, religion only where explicitly selected as constraints

A hard incompatibility blocks the introduction rather than being averaged away by personality similarity.

### Step 2: compatibility components
Initial MVP weighting:
- Values alignment: 35%
- Relationship-needs fit: 30%
- Conflict/repair interaction fit: 25%
- Cognitive interaction fit: 10%

These weights are hypotheses and should be calibrated with observed outcomes rather than treated as permanent truth.

### Values alignment
Similarity is generally preferred for core values.

### Relationship-needs fit
Autonomy, closeness, reassurance, vulnerability, social energy, and emotional intensity do not always require exact similarity. Moderate differences can be compatible; extreme mismatches create predicted friction.

### Conflict and repair
Repair orientation receives more weight than superficial style similarity. Two direct people may work well together; two indirect people may work well together; a mismatch can also work if both are high in repair capacity. This should be calibrated from user feedback.

### Cognitive interaction
This is intentionally lower-weighted. Similarity can make communication easier, while some difference can be stimulating. Wonder should not over-optimize for sameness.

## Confidence
A compatibility score without measurement confidence is misleading.

Every match result should include:
- compatibility score
- confidence score
- component scores
- hard conflicts, if any
- strengths
- potential tensions

Low-confidence profiles should generate language such as 'Wonder has an early hypothesis' rather than a definitive claim.

## Learning loop
After introductions, collect structured feedback:
- interest before meeting
- did they meet?
- desire for a second date
- felt understood
- conversational ease
- attraction
- emotional safety
- intellectual stimulation
- values fit
- reasons for rejection

Use this later to recalibrate match weights and question informativeness.

## Product principle
Wonder should optimize for successful relational outcomes, not for producing an impressive personality report. The Mirror earns trust and engagement; the matching model is the product's core decision system.