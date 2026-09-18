const { ARCHETYPES, VERSION: MODEL_VERSION } = require('./archetype-system-v2');
const VERSION = 'wonder-mirror-library-2026.09';
// Editorial hypotheses, deliberately distinct from response-specific evidence.
// Each row: opening, mind, intimacy, needs, stress, repair, practice, reflection.
const WRITING = {
 Architect: [
 'You may feel most at home when what matters has a structure capable of holding it. Your care often becomes visible in what you remember, arrange, and follow through on. The invitation is to let yourself be known before everything is in order.',
 'You look for the underlying mechanism. A confusing situation becomes more manageable when you can name the parts and understand how they interact. In a relationship, however, a good explanation may arrive before the other person feels heard.',
 'Love can take the form of reliability: making the plan, keeping the promise, noticing what needs doing. A partner may still need the feeling beneath that competence expressed in words.',
 'Look for respect for your thinking, reciprocal effort, and someone who can ask for emotional presence without dismissing practical care. Reliability and tenderness need not compete.',
 'Uncertainty may pull you toward organizing, correcting, or taking charge. Notice when a shared problem quietly becomes your project and the other person loses a voice.',
 'Before proposing a solution, ask what landed badly. Reflect back their experience, name your part, and agree on one change together. Understanding is not the same as agreeing with every interpretation.',
 'Once this week, say what you need before describing how you intend to solve it. Leave enough silence for someone else to respond.',
 'Where am I making myself useful when I would rather make myself known?'
 ],
 Seer: [
 'You may notice the meaning beneath the sentence and the pattern beneath the event. Your attention can make another person feel remarkably visible. It also deserves a boundary: perception is an invitation to inquire, not proof that you already know.',
 'You keep several explanations alive at once. Context, contradictions, and subtle shifts matter to you. This makes complexity interesting, though sometimes a straightforward answer gets buried beneath its possible meanings.',
 'Intimacy may begin with a conversation that goes somewhere neither person expected. You bring attentive questions and an appetite for inner life. Let the other person surprise your interpretation.',
 'You may thrive with curiosity, emotional candor, and room to think aloud without being forced into immediate certainty. Depth also needs practical availability.',
 'A small change can become a large interpretive project. When evidence is thin, distinguish what happened from what you fear it means.',
 'Offer your reading as a question: “I noticed this; have I understood it?” Listen to the answer before constructing the next explanation.',
 'Write three columns: what I observed, what I inferred, and what I could ask. Take the question into the actual relationship.',
 'What would I learn if I asked instead of interpreting?'
 ],
 Explorer: [
 'Possibility may be one of your forms of oxygen. You discover yourself through encounters, experiments, and changes of scene. A lasting bond can offer somewhere to return without closing the world around you.',
 'You often learn by trying. An unfamiliar setting can reveal something that careful planning could not. Your openness becomes especially useful when paired with the patience to notice what an experience actually teaches.',
 'You bring play, invitations, and a willingness to interrupt stale routines. Shared novelty can open intimacy, but ordinary days reveal whether attention survives without stimulation.',
 'You may need movement, choice, and a partner who is interested in discovery. You also deserve clear agreements about what freedom means to each of you.',
 'When connection becomes difficult, a new possibility may seem more compelling than the unfinished conversation. Ask whether you want expansion or relief.',
 'Return at an agreed time, even if you still feel restless. Name the constraint you experienced without making your partner responsible for all discomfort.',
 'Create one small adventure and keep one ordinary promise. Notice which kind of closeness each makes possible.',
 'What am I willing to stay curious about after the novelty has passed?'
 ],
 Sovereign: [
 'You may move toward life with a strong sense of agency. Decisions, responsibility, and consequential work can feel natural to you. Intimacy asks for a different kind of strength: influence that leaves room for another person to remain fully themselves.',
 'You look for the point at which understanding can become action. You may prefer a clear position to an unresolved discussion. Slower deliberation can still contain information worth having.',
 'You can offer direction, commitment, and protection. A partner needs to feel chosen as an equal participant, rather than fitted into an already completed plan.',
 'Mutual respect matters. Look for someone who can disagree, make requests, and carry their own commitments while remaining emotionally available.',
 'Pressure may sharpen certainty and make negotiation feel inefficient. Watch for the moment when decisiveness turns into deciding for both people.',
 'Ask how your delivery affected the conversation. Let the other person finish. Replace a unilateral solution with an agreement both of you can decline or revise.',
 'In one shared decision, ask what matters to the other person before presenting your preferred outcome.',
 'Can I remain powerful without needing to be in control of this interaction?'
 ],
 Alchemist: [
 'You may experience life as material for transformation. Feeling, imagination, and meaning can make an ordinary encounter unusually vivid. The task is to give that depth a form that can survive ordinary life.',
 'You connect events to what they are becoming. You may see creative possibilities in disruption and hold contradictory feelings without wanting to flatten them.',
 'You bring emotional range and a willingness to meet another person in change. Intensity can open a door; consistency determines whether it becomes a home.',
 'You may need honest feeling, imaginative room, and dependable agreements. A relationship can be alive without continually reinventing its foundations.',
 'A charged moment may feel like the whole truth of the relationship. Give temporary states enough time to become information before turning them into conclusions.',
 'Name the feeling, the specific event, and the request separately. Return to the conversation after the emotional peak and check which parts still feel true.',
 'Track one promise over a week. Notice how steadiness changes your experience of desire, trust, or creative freedom.',
 'What remains meaningful when this moment is no longer intense?'
 ],
 Devotee: [
 'You may love through sustained attention. Small continuities matter: the remembered detail, the thoughtful return, the choice to stay present. Your care is most generous when it includes your own needs.',
 'You notice the condition of the bond. Changes in responsiveness or reciprocity may register quickly, sometimes before you have enough context to explain them.',
 'You bring tenderness, loyalty, and investment. The depth of what you give can be a gift, but it does not oblige you to carry the entire relationship.',
 'You may need clear affection, reliable contact, and mutual initiative. Ask what reciprocity looks like in practice rather than expecting the other person to infer your standard.',
 'Uncertainty may invite extra effort, checking, or accommodation. More giving does not necessarily produce more security.',
 'State the unmet need without submitting a ledger of every contribution. Ask for a concrete change and watch whether it is sustained.',
 'Make one direct request before offering additional care. Let receiving be part of how you participate.',
 'Would I still choose this level of giving if I knew it would not earn reassurance?'
 ],
 Guardian: [
 'You may make belonging tangible through continuity. People can come to rely on the calm, practical conditions you create. Your steadiness can support growth when safety includes the freedom to change.',
 'You value what has proved dependable. You often notice whether a plan can work in daily life, including the small details enthusiasm can overlook.',
 'Love may look like showing up repeatedly. Familiar rituals and a trustworthy rhythm can matter more than spectacle.',
 'You may need consistency, integrity, and shared expectations. A compatible relationship should also allow preferences and plans to be renegotiated.',
 'Change may feel like a threat to something hard won. Notice whether you are protecting a real value or simply a familiar arrangement.',
 'Name what you are afraid of losing, then explore how that value might survive a different approach. Agree on a small, reversible experiment.',
 'Invite one modest change to a shared routine. Keep the underlying commitment explicit while allowing the form to move.',
 'What is worth preserving here, and what is merely familiar?'
 ],
 Maverick: [
 'You may place a high value on authorship: a life that feels chosen from the inside. Your originality can make space for others to be less conventional too. Closeness becomes possible when dependence can be voluntary without feeling like capture.',
 'You question inherited assumptions and notice the costs of conformity. Sometimes the unconventional option is right; sometimes a familiar answer can still be freely chosen.',
 'You bring independence, candor, and respect for difference. Let a partner know how to reach you without making them guess whether space means disinterest.',
 'You may need autonomy, honest agreements, and acceptance without possession. Independence works best when both people can ask for connection.',
 'A request may register as an attempt to control you before its actual scope is clear. Separate the request from the story it evokes.',
 'Say what you can offer and what you cannot. If you need distance, give it an agreed shape and return rather than leaving the relationship suspended.',
 'Accept one small act of care without immediately balancing the debt. Notice whether receiving actually reduces your freedom.',
 'What kind of closeness am I refusing because I have mistaken it for control?'
 ],
 Diplomat: [
 'You may have a gift for keeping contact possible across difference. You can hear several positions without making every disagreement a rupture. Your own position belongs in that conversation as well.',
 'Context and interpersonal consequences enter your reasoning early. This helps you translate between people, though it can make your own preference harder to hear.',
 'You offer listening, repair, and an instinct for mutual understanding. Mediation should not become a permanent assignment in your closest relationships.',
 'You may need considerate communication and someone willing to meet you halfway. Peace is more meaningful when it contains honest disagreement.',
 'You may smooth the surface while privately accumulating frustration. Apparent agreement can leave both people working from the wrong information.',
 'Begin with the part you have not said. Use a clear preference rather than a softened suggestion, and allow the other person to respond.',
 'Express a low-stakes disagreement without immediately resolving the tension for everyone.',
 'What would I say here if maintaining harmony were not my responsibility?'
 ],
 Catalyst: [
 'You may create movement wherever you become engaged. Your energy turns possibility into an invitation, a decision, or a first step. What begins with momentum becomes meaningful through attention to what follows.',
 'You see openings and often act before every detail is settled. That can release a stalled situation, especially when you remain receptive to feedback after the first move.',
 'You bring initiative and a sense that life can happen now. Make room for a partner whose enthusiasm arrives at a different pace.',
 'You may need responsiveness, shared participation, and room for change. A sustainable bond also needs pauses that are not interpreted as withdrawal.',
 'You may accelerate when slowing down would reveal useful information. A new plan can distract from a conversation that needs completion.',
 'Ask what was left behind by the speed of the interaction. Slow your reply, agree on a next step, and follow through before opening another front.',
 'Finish one relational promise before making the next invitation. Notice the difference between excitement and trust.',
 'What would become visible if I allowed this moment to stay still?'
 ],
 Scholar: [
 'You may meet the world through disciplined inquiry. Understanding has its own pleasure, and careful thought can be a form of care. Intimacy asks that your ideas remain connected to the person having the experience.',
 'You prefer distinctions that can withstand scrutiny. Time to think may improve your answer. Let others know when reflection is active rather than leaving silence unexplained.',
 'Shared inquiry and a well-formed conversation may draw you close. Emotional disclosure does not need to be theoretically complete before it can be offered.',
 'You may need intellectual respect, solitude, and a partner who values questions. You also need permission to be uncertain about yourself.',
 'You may move into explanation when a feeling is difficult to inhabit. The account can be accurate while the encounter still feels distant.',
 'Acknowledge the emotional impact before discussing the reasoning. Offer a simple feeling or need that has not yet been fully analyzed.',
 'In one conversation, replace an explanation with a sentence beginning “I felt…” and stop there long enough to be met.',
 'What do I know how to explain that I have not yet let myself feel?'
 ],
 Artisan: [
 'You may make inner experience tangible through form, atmosphere, and detail. Beauty can be a way of paying attention. You deserve to be known beyond what you make or the world you curate around you.',
 'You register texture, proportion, and subtle differences in expression. Your judgment may arrive as a felt coherence before you can explain its parts.',
 'You offer attentive gestures and a sensitivity to shared environments. Let the person behind the gesture speak as plainly as the gesture itself.',
 'You may need creative room, thoughtful attention, and interest in your inner process. Agreement in taste is less important than respect for what that taste means to you.',
 'When exposed, you may retreat into refinement or become unusually exacting. A preference can become a defense against the messiness of being seen.',
 'Name the feeling underneath the aesthetic or practical complaint. Make the request understandable without requiring someone else to share your sensibility.',
 'Share something unfinished with a trusted person. Ask for company before asking for critique.',
 'What would I allow someone to see if it did not have to be beautifully expressed?'
 ],
 Steward: [
 'You may show care by accepting responsibility for what others depend on. You notice the work that keeps life functioning. A shared life should make you a participant in care, not its permanent infrastructure.',
 'You consider consequences, duties, and the people who will be affected. Your judgment can hold a longer horizon than immediate convenience.',
 'You bring practical support and a capacity to stay with important commitments. Being needed is not the only evidence that you are loved.',
 'You may need shared responsibility, appreciation, and the freedom to rest without explanation. Look for initiative that appears before you have to delegate it.',
 'You may take on more precisely when your own capacity is smallest. Quiet over-functioning can conceal how uneven the arrangement has become.',
 'Make the invisible work visible without treating exhaustion as a moral credential. Agree on ownership of tasks, not merely occasional help.',
 'Leave one appropriate responsibility with someone else. Resist supervising the entire result.',
 'What do I need when I am not being useful to anyone?'
 ],
 Visionary: [
 'You may feel the pull of a future before it has a recognizable shape. Possibility, meaning, and imagination organize your attention. Love needs a place in that future and a lived presence today.',
 'You connect distant ideas and imagine systems beyond current constraints. Translation matters: other people may need the next concrete step before they can follow the horizon.',
 'You invite a partner into a larger sense of becoming. Their present experience needs as much curiosity as the life you imagine together.',
 'You may need imaginative engagement and a willingness to grow. You also benefit from someone who can ask practical questions without being cast as the enemy of possibility.',
 'The next chapter may become more compelling than the demands of the current one. Ordinary maintenance can then feel unfairly small.',
 'Ask which present need has been postponed in the name of the future. Make one promise you can fulfill now.',
 'Translate a large shared hope into one action this week, chosen together.',
 'How does the future I describe feel to the person living with me in the present?'
 ],
 Sentinel: [
 'You may notice what is vulnerable before others see a problem. Discernment helps you protect what has been entrusted to you. Trust grows when attention to risk can also register evidence of reliability.',
 'You examine consistency, omissions, and the gap between claims and actions. Your caution is most useful when it can update as new evidence arrives.',
 'You bring careful judgment and respect for commitments. A partner also needs to know when they have earned trust, rather than facing a test with no finish line.',
 'You may need dependable behavior, clear boundaries, and answers that survive follow-up. Reassurance is stronger when it is concrete and reciprocal.',
 'An ambiguous event may sharpen vigilance. Monitoring can create a temporary feeling of control without resolving the uncertainty beneath it.',
 'Describe the specific breach or concern. Agree on what repair would look like, including how you will recognize when enough has been done.',
 'Record one piece of evidence that supports trust alongside one concern. Give both the same standard of scrutiny.',
 'What evidence would actually allow me to relax my conclusion?'
 ],
 Muse: [
 'You may bring aliveness through attention, imagination, and emotional presence. An encounter can change in your company. Being evocative is different from being understood, and you deserve the latter.',
 'Feeling and association may lead you toward insights a linear account would miss. Make room to test whether an evocative possibility fits the situation.',
 'You offer warmth, texture, and imaginative attention. A partner should remain interested when you are ordinary, tired, or less available to inspire.',
 'You may need affection, creative freedom, and curiosity about your less polished interior. Admiration alone cannot carry mutual intimacy.',
 'Changes in attention may feel like changes in your value. You may feel pulled toward becoming more compelling rather than asking what has happened.',
 'State the need underneath the performance. Ask to be met in the feeling rather than attempting to restore the atmosphere on your own.',
 'Let a trusted person see an unremarkable moment without embellishing it. Notice whether the connection remains.',
 'Where am I being appreciated as an image rather than encountered as a person?'
 ],
 Strategist: [
 'You may understand a situation by reading its moving parts: motives, incentives, timing, and consequence. Foresight can be protective. Intimacy also needs moments in which nothing is being optimized.',
 'You hold several possible outcomes in mind before acting. This can support measured decisions, provided other people remain people rather than variables in a model.',
 'You bring discernment and calibrated commitment. A partner may need access to your uncertainty as well as the conclusion you have carefully prepared.',
 'You may need candor, competence, and a relationship in which trust is compatible with independent judgment. Reciprocity matters more than maintaining an advantage.',
 'You may manage the interaction to reduce vulnerability. A carefully positioned response can leave your actual need unavailable to the other person.',
 'Say what you hoped would happen and what you feared. Avoid testing someone with a question whose real purpose you have concealed.',
 'Make one direct request without managing the other person toward the answer first.',
 'What would I say if I did not need to protect my position?'
 ],
 Connector: [
 'You may make people feel that there is room for them. Social energy, inclusion, and exchange can be genuine sources of meaning. Depth asks for attention that does not need an audience.',
 'You often think through conversation and notice how people connect. Your social awareness is useful, though a group response need not settle your private judgment.',
 'You bring invitations, warmth, and relational momentum. Make room for the quieter intimacy that grows when two people are no longer performing their most engaging selves.',
 'You may need responsive contact and a shared social life. A partner with a smaller social appetite can still be deeply invested.',
 'A lull in contact may invite more reaching out or a search for reassurance elsewhere. Pause long enough to identify whose attention you actually want.',
 'Speak to the person involved before seeking a consensus among friends. Ask for what would make the connection feel more present.',
 'Choose one unhurried conversation without multitasking or adding more people to the plan.',
 'With whom do I feel known when I am not being socially useful or entertaining?'
 ],
 Idealist: [
 'You may organize life around what deserves to be true. Conviction can make your care principled and your commitments serious. A relationship must still have room for imperfect people who are learning.',
 'You notice the distance between stated values and lived choices. This can clarify what matters, as long as disagreement is not automatically treated as moral failure.',
 'You bring seriousness, loyalty, and a desire for shared meaning. Ordinary kindness may reveal values more reliably than perfect philosophical agreement.',
 'You may need integrity and a partner willing to examine how they live. Shared direction can coexist with different language, experience, or conclusions.',
 'Disappointment may become a global judgment about someone’s character. Distinguish a harmful pattern from a repairable human mistake.',
 'Name the value that was hurt and the behavior that would restore confidence. Leave room for an account of the event you have not considered.',
 'Notice one imperfect action that still expresses real care. Let complexity inform your standards without abandoning them.',
 'Am I asking for integrity, or for freedom from the disappointment of another person’s humanity?'
 ],
 Pilgrim: [
 'You may treat experience as a path toward deeper understanding. Growth matters because you want your life to become more consciously chosen. Belonging can be part of that journey rather than the place where it ends.',
 'You ask what an experience reveals and how it changes your direction. Reflection becomes useful when it also informs the next ordinary choice.',
 'You bring openness to becoming and a willingness to question familiar patterns. A partner needs to know what you are choosing while you are still evolving.',
 'You may need space for discovery, honest conversation, and a relationship that can change shape through mutual agreement.',
 'A sense that something more authentic lies elsewhere may postpone engagement with the difficulty here. Growth and departure are not always the same decision.',
 'Describe what is changing in you without presenting it as a completed verdict on the relationship. Ask what can evolve together.',
 'Choose one present commitment that expresses the person you are becoming. Let practice carry some of the work reflection has been doing.',
 'What am I ready to live now, before I fully understand where it leads?'
 ]
};
function reportFor(name) {
 const a=ARCHETYPES[name],w=WRITING[name];if(!a||!w)return null;
 return {name,version:VERSION,model_version:MODEL_VERSION,essence:a.essence,elements:a.elements,opening:w[0],gift:a.relational.gift,need:a.relational.need,shadow:a.relational.shadow,
 chapters:[['How your mind moves',w[1]],['The way you come close',w[2]],['Conditions for connection',w[3]],['When pressure arrives',w[4]],['A way back to each other',w[5]],['A practice for this week',w[6]]].map(([title,body])=>({title,body})),prompt:w[7],
 note:'An interpretive framework, not a diagnosis or fixed identity. Keep what fits; question what does not.'};
}
function personalizedReport(model,archetypes,mirror){
 const primary=archetypes?.[0],secondary=archetypes?.[1];
 const report=reportFor(primary?.name); if(!report)return null;
 const gap=Math.max(0,(primary.score||0)-(secondary?.score||0));
 return {...report,secondary:secondary?.name||null,blend_note:secondary?`Your ${secondary.name} pattern brings ${ARCHETYPES[secondary.name]?.relational.gift}. ${gap<.055?'Your leading patterns are close; the order should remain provisional.':'This adds another way your primary pattern may be expressed.'}`:null,
 evidence:{headline:mirror.headline,mind:mirror.move,values:mirror.drive,relationship:mirror.relationship,pressure:mirror.pressure,patterns:mirror.patterns,elements:mirror.elements,uncertain:mirror.uncertain},
 interpretation:'The report chapters describe the archetype. The “From your answers” section reflects your assessment responses; neither predicts relationship success.'};
}
module.exports={VERSION,WRITING,reportFor,personalizedReport,catalog:()=>Object.keys(ARCHETYPES).map(reportFor)};
