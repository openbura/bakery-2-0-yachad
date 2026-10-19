> עדכון פרסום 19.10.2026: המשתמש אישר העלאה ציבורית במצב **קטלוג וסל לצפייה בלבד**. ההזמנות, הסליקה וה־Push יישארו כבויים; אין שינוי ב־Supabase החי. [פרטי הגרסה והבדיקות](./CATALOG_RELEASE_HE.md). עדכון זה גובר על הוראות הפרסום ההיסטוריות בהמשך.

# Yachad Bakery — legal and payment release gate (updated 19.10.2026)

Status: **NOT READY TO PUBLISH**. Stored orders, tracking and owner alerts run against isolated local SQL. Web Push subscription/queue/sender code is now implemented locally; provider delivery, locked physical devices and cloud runtime are unverified. See [Push evidence and limits](./PUSH_LOCAL_QA_HE.md). Checkout no longer hands orders to WhatsApp. There is no Grow charge, payment confirmation, SMS or transaction document. No remote migrations/deployments were performed. Privacy copy describes opt-in subscription data and the persistent local tracking-link mapping; content remains draft for owner/counsel review. Do not deploy commercially until the gates below are closed.

## Owner input still required — short, nontechnical list

- Final approved customer-service contact route and a verified contact route for accessibility requests to Ido, the owner. The existing WhatsApp ordering destination is not yet approved as a customer-service or accessibility contact.
- Approved delivery areas and fee; any order minimum; preparation times and delivery windows/times.
- Verified product data, in this order: **(1) allergens, (2) weight/quantity, (3) ingredients, (4) storage instructions where relevant**. Do not infer details from names or images. Missing storage instructions alone do not hold the entire site; continue to mark missing information clearly.

Verified taxpayer details (closed): registered business type **עוסק מורשה**; registered operator **מלכאן ג'אן**; business number **015874662**; registered trade name **כלבו עידן - מאפיית יחד**; registered operator address **ויצמן 120, כפר סבא**. The consumer-facing bakery name is **מאפיית יחד**. The physical branch and pickup address are **היוצרים 3, כפר סבא**; this is not the registered operator address. The branch is accessible and Ido, the owner, is the accessibility contact. Pickup is during the branch's published business hours. Ido handles receipts/invoices and refunds after Grow is connected. Do not request these confirmed facts again or ask the owner to choose payment methods again if they are already defined in the project.

Internal TODO before final handoff: confirm the precise usage rights for photos originating from the bakery's work with 10bis/CloudFront. The owner has approved keeping the existing photos on the site for now; do not remove, replace, or make a public claim that rights were verified. This check alone is not an independent release blocker.

Cancellation and refunds now have a practical customer-facing policy. Privacy uses purpose-limited collection and retention, and order details are not treated as marketing consent. Do not ask the owner to decide legal wording or a numerical retention period without a verified basis.

## Release blockers — separate from owner questions

- **Grow payment integration is not built.** Before commercial checkout: create payments on the server, verify the live order amount and availability, verify payment through a trusted server notification, assign an order ID and send confirmation, connect receipts/invoices, and support refunds. Do not treat a return URL as payment proof. Do not collect or log direct card details in this site.
- After Grow is implemented, reconcile the legal copy and checkout notice with actual shared fields, payment methods, card/token handling and refund flow, then test success, failure and cancellation on mobile and keyboard.
- Complete the genuinely missing owner facts above before publication: final service/accessibility contact routes, delivery rules/times, and necessary food facts. Publish a verified contact route to Ido; do not invent parking, toilets, lifts or other branch arrangements.
- Verify that access to, retention of and deletion of stored order records and any manual customer-service conversations match the privacy notice. Set an operational process without inventing a numerical retention period.
- Have the final consumer terms, privacy notice and accessibility statement reviewed against the implemented service and perform an accessibility review, including assistive-technology checks. Code/browser checks alone are not certification.

Grow sources: https://developers.grow.business/reference/payment-page ; https://developers.grow.business/reference/create-payment-link ; https://developers.grow.business/reference/the-process ; https://grow.business/privacy-policy/ .

## Code audit snapshot

- Public services found: Vercel hosting, Supabase public catalog/realtime, WhatsApp/Meta on user-initiated handoff, Google Fonts, external CloudFront product images, Google Maps and Instagram links. Separate admin uses Supabase Auth and audit tables.
- No GA4, GTM, Meta Pixel, Hotjar, newsletter form, marketing checkbox, payment provider, or nonessential tracker was found in the current public source. The cart, fulfillment choice and a separate contact/address draft are held in sessionStorage in this tab. Personal fields do not enter browser history or the shop URL. Browser tab restoration may restore the session draft; privacy copy reflects this.
- No cookie banner was added. Re-audit if analytics/marketing scripts or embedded payment components are introduced.
- Frontend-only validation is not an order/payment security boundary. Grow integration needs trusted server validation and secret management.
- Dependency follow-up (19.10.2026): isolated installs in this repair worktree resolve PostCSS 8.5.23 and nanoid 3.3.18 plus six compatible transitive patches. Full `npm audit` reports zero known vulnerabilities in both apps. This does not assert complete application security; re-run before launch.

## Recovered online-order decision — 19.10.2026

The approved future flow is a server-stored order with an order ID, private customer tracking, and owner approval **before final charge**, with separate order/payment states. Grow J5 permission, capture on owner approval, rejection/release behavior, idempotent verified server notifications and real sandbox tests remain gates. `approveTransaction` acknowledges receipt of Grow's notification; it is not bakery owner approval or a delayed-charge switch. See `ONLINE_ORDERS_AND_ALERTS_HE.md`. At online launch, replace the temporary WhatsApp submission and update these draft terms/privacy/shipping pages to match the implemented online service.

## Product data missing list

The 78-product public catalog has no verified structured allergen, ingredient or storage data yet. Review allergens first, then weight/quantity, then ingredients; request storage instructions where relevant. Some product names or sale-unit labels mention quantity, but they are not a substitute for owner verification. Product IDs/names are listed below for follow-up.

- `bourekas-01` — 1 ק״ג בורקסים מיקס הפתעה
- `bourekas-02` — 1 ק״ג בורקס תפוח אדמה
- `bourekas-03` — 1 ק״ג בורקס גבינה קלאסי
- `bourekas-04` — 1 ק״ג בורקס פיצה
- `bourekas-05` — 1 ק״ג בורקס פטריות
- `pizza-sambusak-01` — פיצה אישית
- `pizza-sambusak-02` — פיצה משפחתית + תוספת
- `pizza-sambusak-03` — פיצה פסטו אישית
- `pizza-sambusak-04` — סמבוסק גבינות
- `pizza-sambusak-05` — סמבוסק פיצה וזיתים
- `pizza-sambusak-06` — סמבוסק פסטו בולגרית
- `salads-01` — סלט ירקות בהרכבה
- `sandwiches-toasts-01` — כריך טונה
- `sandwiches-toasts-02` — כריך חביתה
- `sandwiches-toasts-03` — כריך בולגרית
- `sandwiches-toasts-04` — כריך סלט ביצים
- `sandwiches-toasts-05` — כריך סביח
- `sandwiches-toasts-06` — טוסט בהרכבה
- `sweets-01` — 1 ק״ג קוראסון שוקולד
- `sweets-02` — 1 ק״ג קוראסון רוגלח
- `sweets-03` — 1 ק״ג גביניות
- `sourdough-breads-01` — לחם כוסמין
- `sourdough-breads-02` — לחם דגנים
- `sourdough-breads-03` — לחם אגוזים וצימוקים
- `sourdough-breads-04` — לחם אגוזים
- `sourdough-breads-05` — לחם זיתים
- `sourdough-breads-06` — לחם בצל
- `cakes-01` — עוגת גבינה פירורים
- `cakes-02` — עוגת גבינה אפוייה
- `cakes-03` — עוגת גבינה אפוייה ללא תוספת סוכר
- `cakes-04` — עוגת אוריאו
- `cakes-05` — עוגת גבינה ותות טבעוני
- `cakes-06` — עוגת טריקולד
- `cakes-07` — עוגת שוקולד בלגי ללא תוספת סוכר
- `cakes-08` — עוגת בסקוויטים טבעונית
- `cakes-09` — עוגת בסקוויטים איכותית
- `cakes-10` — עוגת 10 שכבות
- `cakes-11` — עוגת מוצרט
- `cakes-12` — עוגת שוקולד לבן פיסטוק
- `cakes-13` — עוגת גבינה ללא תוספת סוכר
- `cakes-14` — עוגת קינדר בואנו
- `cookies-01` — עוגיות אלפחורס
- `cookies-02` — עוגיות שושנים
- `cookies-03` — עוגיות ריבה
- `cookies-04` — עוגיות אוזני פיל
- `cookies-05` — עוגיות גרנולה ללא תוספת סוכר
- `cookies-06` — עוגיות שוקו צ’יפס
- `cookies-07` — עוגיות שוקו צ’יפס ללא תוספת סוכר
- `cookies-08` — עוגיות ריבה ללא תוספת סוכר
- `cookies-09` — עוגיות אלחפורס ללא תוספת סוכר
- `cookies-10` — עוגיות בראוניז
- `cookies-11` — עוגיות מושלגות
- `cookies-12` — עוגיות תמרים
- `bread-01` — 10 יחידות לחמניות חלקות מובחרות
- `bread-02` — 10 יחידות לחמניות סומסום מובחרות
- `bread-03` — 10 יחידות לחמניות קלועות איכותיות
- `bread-04` — 10 יחידות לחמניות המבורגר
- `bread-05` — 4 יחידות לחמניות כוסמין
- `bread-06` — 4 יחידות לחמניות דגנים
- `bread-07` — 4 יחידות חלה אישית
- `bread-08` — 4 יחידות חלה אישית מתוקה
- `bread-09` — 3 יחידות לחמניות בייגלה
- `bread-10` — 3 יחידות בייגל רומני זעתר
- `bread-11` — 3 יחידות בייגל טוסט
- `bread-12` — 3 יחידות לחם זעתר
- `bread-13` — 3 יחידות בייגל רומני שומשום
- `bread-14` — 3 יחידות בייגל רומני מלח
- `bread-15` — 4 יחידות לחמניות חיטה מלאה
- `bread-16` — 3 יחידות לחם שום
- `drinks-01` — מים מינרליים
- `drinks-02` — פחית קולה
- `drinks-03` — פחית קולה זירו
- `drinks-04` — פחית ספרייט
- `drinks-05` — פחית ספרייט זירו
- `drinks-06` — פחית פאנטה
- `drinks-07` — פחית ספרינג תות בננה
- `drinks-08` — פחית ספרינג פירות טרופיים
- `drinks-09` — פחית ספרינג תפוזים
