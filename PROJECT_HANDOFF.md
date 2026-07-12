# Project Handoff — Bakery / Yachad Bakery

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
