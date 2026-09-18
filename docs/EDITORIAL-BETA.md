# WONDER editorial beta

This change extends the existing vanilla-JavaScript/Vercel application and its Supabase backend. It does not replace the production waitlist or either investor site.

## Experience
- Five-element assessment retains the 35 core items and 6–10 adaptive refinement items.
- Server-side scoring uses the existing 20-archetype v2 model, with primary and secondary interpretations.
- Each archetype has a complete editorial report; personalized observations remain distinct from generic archetype chapters.
- Demo profiles, journal records, and guided mirror responses use a separate browser session store. The demo never creates a Supabase user, match, assessment snapshot, or traction record.
- Real journal entries and post-date reflections are private account-owned database records.
- Live AI requires OPENAI_API_KEY and optionally OPENAI_MODEL. It reads only the authenticated user's assessment and conversation history. It does not read journal entries.
- The mirror uses a local water photograph with WebGL displacement and touch waves. Nature panels use slow photographic movement; reduced motion is respected.

## Local preview
Run `node scripts/dev-server.js`. Demo, public report catalog, and demo assessment work without credentials. Real account flows require the Vercel runtime environment.

## Deployment
Deploy this branch to the existing `wonder-mvp-preview` project. Preserve the public waitlist and other project domains. Required existing variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY). AI requires OPENAI_API_KEY. Do not place server credentials in frontend code.

## Media
Local photographs downloaded from Unsplash. Source pages:
- Water: https://unsplash.com/photos/sunlight-patterns-on-the-sandy-ocean-floor-tuNmneX1f6k — fady haff.
- Fern: https://unsplash.com/photos/a-close-up-of-a-fern-leaf-in-the-dark-9ODVk8G244c — Louis Gaudiau.
- Forest: https://unsplash.com/s/photos/peaceful-landscape — underlying image photo-1731361968477-859322bd74be.
Fonts: Cormorant Garamond and DM Sans through Google Fonts. No user reference image is republished as product photography.

## Interpretation
Archetypes and matching scores are product hypotheses, not validated psychometrics or guarantees. No probability of relationship success is displayed. The demo introduction is explicitly fictional and its nature study is not a portrait of a real member.
