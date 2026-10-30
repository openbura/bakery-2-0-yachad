> 30.10.2026 — פורסם ונבדק בחי באישור בוס: מסך הזמנות WhatsApp באדמין, פרטיות/ביטולים/נגישות, סימון נגיש למחירים וחמש פחיות ב־10 ₪. חנות `dpl_Gcsud8oWZA7USgTNanAvsN7JoJXd`; אדמין `dpl_8q4ogssgW5bhS6W75WkEXQx5XvKn`, שניהם READY בקישורים הקבועים.222מוצרים נשמרו; רק חמש רשומות המחיר עודכנו במסד. הכריכים32 ₪, הסלט45 ₪, עוגות יחד75 ₪ ומגש12ב־144 ₪ נשמרו. מקור המימוש `05c70db`, ענף `fix/yachad-live-sync-20261028`. [פרסום, בדיקות ושחזור](./RELEASE_20261030_HE.md). הסעיפים הבאים היסטוריים.

> 28.10.2026 — סנכרון החנות והאדמין פורסם באישור בוס ואומת בחי:222מוצרים/20קטגוריות/30קבוצות/238אפשרויות בענן. שינויי מחיר, זמינות, הודעה וסגירה נבדקו מול לשונית חנות פתוחה, וכל ערכי הבדיקה שוחזרו. חנות `dpl_2QmKZWu2GtJG9oV11B48To9XJfdh`; אדמין `dpl_HUcDn6FwvHfL1d1rDMuSM2Mjx6cm`, שניהם READY. קבלת הזמנות דרך WhatsApp בלבד; אין סליקה/כתיבת הזמנות/Push. החנות קוראת ענן (OWNER_REVIEW=false), עם Realtime, גיבוי10שניות ואימות לפני WhatsApp. חסימת שעות ישראל05–21 א׳–ה׳,05–16 שישי ושבת סגור. [דוח ובדיקות ושחזור](./LIVE_SYNC_20261028_HE.md). ההמשך היסטורי וגובר עליו עדכון זה.

> עדכון פרסום 19.10.2026: המשתמש אישר העלאה ציבורית במצב **קטלוג וסל לצפייה בלבד**. ההזמנות, הסליקה וה־Push יישארו כבויים; אין שינוי ב־Supabase החי. [פרטי הגרסה והבדיקות](./CATALOG_RELEASE_HE.md). עדכון זה גובר על הוראות הפרסום ההיסטוריות בהמשך.

> עדכון 2026-10-19: המשך העבודה הוא על הזמנות אונליין, מעקב ללא ETA ותור התראות המחוברים למסד מקומי בלבד ב־`yachad-shop-repairs-20261019/project`. [גרסה פעילה](./ACTIVE_VERSION.md) · [קבצים, בדיקות וגבולות](./ONLINE_ORDERS_LOCAL_QA_HE.md). לא נגעו בחי, לא חוברה סליקה ולא בוצעו commit/push/deploy. אין לחזור למסלול שליחת הזמנה ב־WhatsApp. יתר התיעוד היסטורי.

# Project Handoff — Bakery / Yachad Bakery

> המשך 19.10.2026: [Push ללקוח ולבעלים — מקומי בלבד](./PUSH_LOCAL_QA_HE.md). המפתח המקומי נשמר תחת `review/push-tools/secrets` המוחרג מ־Git. אין להעתיק אותו לייצור או להחליף את transport הלכידה בשליחה אמיתית ללא אישור. אין עדיין הוכחת מסירה למסך נעול.

עודכן: 2026-07-12

## Git

- Release branch: `codex/bakery-production-release`
- Production branch: `main`
- Public/Supabase integration checkpoint: `a2f4f0b37a4408db03c4c20cce05e9d770762779`
- Vercel routing checkpoint: `09aab782fada1c9e749062814fc51107dc6ec353`

## Production

- Public: https://bakery-2-0-yachad-deploy.vercel.app/
- Shop: https://bakery-2-0-yachad-deploy.vercel.app/shop
- Admin: https://yachad-bakery-admin.vercel.app/
- Supabase target: `utyzqpjjjwjkkdlepkag` בלבד.

## מצב פונקציונלי

- Public: עמוד בית קולנועי, `/shop`, 78/10/2/24, Realtime, fallback צפייה בלבד, cart reconciliation ואימות WhatsApp.
- Admin: Auth אמיתי, session restore/logout, דשבורד/מוצרים/הגדרות, עדכונים מוגבלים לפי RLS ו־audit.
- כללי משלוח: 15 ₪, מינימום 70 ₪ לפני משלוח; איסוף 0 ₪ ומותר מתחת ל־70 ₪.
- מצב בסיס: כל המוצרים זמינים; ordering/delivery/pickup פעילים; notice כבויה מסוג `info`.

## המשך עבודה בטוח

1. לקרוא `AGENTS.md`, `PROJECT_CONTEXT.md`, `DEPLOYMENT.md`, `PLANS.md` ו־`git status`.
2. לאמת שהיעד הוא `utyzqpjjjwjkkdlepkag`; אין לגעת ב־AM ROM או CONNEX.
3. לשמור על שתי אפליקציות נפרדות ועל publishable keys בלבד בדפדפן.
4. לאחר QA חי להחזיר את כל ערכי הייצור למצב הבסיס.

## מגבלות ידועות

- WhatsApp הוא יעד ההזמנה; אין order storage/reservation בשרת.
- החשבון המשותף אינו מאפשר לזהות איזה אח ביצע פעולה.
- דומיין ותשלום טרם הוגדרו.
