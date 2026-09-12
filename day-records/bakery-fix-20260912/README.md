# Bakery FIX — local review

Baseline: cc89bd5e29aed95e327bb1718043f11b91ea6650. Only the four authorized operational findings were changed.

Start from this directory with `node preview.cjs`. Public preview: http://127.0.0.1:4182/shop ; admin: http://127.0.0.1:4183/login . Ports4180/4181 serve unchanged baseline builds for comparison. One local process serves four isolated preview origins.

The harness injects local-only fetch/Auth/WhatsApp handling into HTML; it is outside product source and must never be deployed. CSP connect-src self plus dummy publishable keys prevent accidental calls to the real backend. All admin edits go to a shared in-memory fixture across tabs and reset on server restart. Local admin fields use invented dummy values; clicking login never uses the live credential.

Clicking the final WhatsApp button captures the text in sessionStorage. Open http://127.0.0.1:4182/__order in the same browser tab/session to inspect it. Nothing is sent.

Source changes live in project/. Existing node_modules are junctions to installed dependencies, not copies or new installs. Real .env values were never copied; local .env files contain dummy values only. Do not deploy these builds as-is. A future approved preview release needs a separate non-production Supabase test environment and its own credentials.

Shared pricing domain lives under admin-dashboard/src/domain/pricing.ts so the separately deployed admin root can include it. Public imports this pure domain module; no UI or React state is shared between apps. Quantity always counts catalog sale items/packages, not grams or the number of rolls inside a package.

Tests: run the command list in verification-summary.json, then core-qa.cjs, fulfillment-qa.cjs, regression.cjs, extra-qa.cjs, price-matrix.cjs against the running local harness. Browser scripts mutate only local fixture data; run them sequentially. visual-qa.cjs captures before/after; home-recapture.cjs settles the homepage animation for pixel-identical comparison.

The preserved original checkpoint ZIP and all original source files remain unchanged; see original-integrity.json. No commits, pushes, deploys, database migrations or live mutations were performed.
