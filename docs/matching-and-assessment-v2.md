# Wonder Assessment + Matching Architecture v3

## Core rule
Archetypes are the primary compatibility representation in the MVP matching model. They are inferred from the underlying person-model dimensions rather than assigned directly from individual answers.

The pipeline is:

1. Intake + hard constraints
2. Five Elements questionnaire responses
3. Dimension-level person model + confidence/evidence
4. Primary + secondary archetype inference
5. Mirror synthesis across the Five Elements
6. Archetype-primary compatibility scoring
7. Dimension / relational viability checks
8. Conviction threshold
9. One introduction, or no introduction
10. Post-date relational-self learning

## Measurement layer
The underlying dimensions remain the evidence base. Archetypes do not replace psychometric measurement; they compress the pattern into a higher-order representation that Wonder uses as the primary matching signal.

Person-model domains include cognitive style, temperament, relationship needs and interaction style, values, identity needs, and stress responses. These are tendencies and hypotheses, not diagnoses.

## Five Elements
The assessment is experienced through five psychological environments:

- Earth: reality / foundations
- Water: emotion / attachment
- Fire: desire / vitality
- Air: mind / worldview
- Ether: meaning / identity

Mirror is not a sixth element. The Elements gather signals; Mirror interprets the pattern across them.

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

An archetype is inferred by similarity between the user's dimension vector and a prototype vector. Wonder returns a primary and secondary archetype. The user is therefore represented as an archetypal blend rather than a fixed type.

### Archetype-primary matching
For matching, Wonder reconstructs each person's archetypal blend from the primary and secondary prototype vectors and evaluates the relationship between those two blended structures.

Initial MVP weighting:
- Archetypal fit: 60%
- Values / life direction: 12%
- Mutual relational support: 11%
- Conflict / repair interaction: 8%
- Cross-element tension support: 6%
- Productive complementarity: 3%

These are product hypotheses and must later be calibrated against observed outcomes.

The archetype layer decides which pairings are most promising. The underlying dimensions answer a second question: is this archetypal pairing actually viable for these two specific people?

## Hard constraints
Hard constraints gate the pool before archetypal chemistry is considered. Current examples include orientation, relationship structure, relationship intention, children, age preference, and geography where supplied.

A hard incompatibility blocks an introduction rather than being averaged away by a strong archetypal score.

## Relational viability
Dimension-level evidence remains important as a safeguard and explanatory layer.

### Values
Core life-direction values should generally align enough for two people to build compatible lives.

### Mutual support
Wonder evaluates directionally whether each person's pattern can support the other's needs for closeness, autonomy, reassurance, vulnerability, and reciprocity.

### Conflict and repair
Repair capacity matters more than superficial conflict-style similarity. A compelling archetypal pairing can still be downgraded when repair or emotional safety looks costly.

### Cross-element tensions
Mirror may identify meaningful internal tensions such as closeness + autonomy, freedom + stability, or achievement + meaning. Matching asks whether the other person's pattern can make room for those tensions rather than forcing one side to disappear.

### Complementarity
Moderate difference can create expansion. Extreme mismatch is not romanticized as complementarity.

## Conviction and scarcity
Wonder does not surface the highest-ranked person simply because someone must be shown.

The engine assigns internal conviction bands: strong, promising, exploratory, weak, or ineligible. An introduction is shown only when archetypal fit and measurement confidence clear the current conviction threshold.

The product should prefer showing nobody over showing somebody Wonder does not believe the user should meet.

The intended user-facing moment is: **We found someone.**

## Confidence
Every match retains measurement confidence, component evidence, hard conflicts, strengths, potential tensions, and the archetypal blend that produced the match.

Low-confidence evidence should reduce conviction rather than produce definitive language.

## Learning loop
After introductions, Wonder collects private structured relational feedback. Relational-self evidence may conservatively recalibrate what Wonder pays attention to for that user, but it must not become a reputation score for another person.

Early relational-learning adjustments are deliberately capped and auditable. They cannot override hard constraints or replace the core archetype model.

## Product principle
Wonder's assessment measures the person. Mirror reveals the higher-order pattern. Archetypes compress that pattern into the primary matchmaking representation. Relational evidence then tests whether that archetypal promise survives contact with real life.