# Bakery project instructions

לפני עבודה יש לקרוא את `PROJECT_CONTEXT.md`, `DEPLOYMENT.md`, `PLANS.md`, `PROJECT_HANDOFF.md`, `README.md` ואת `git status`.

## גבולות

- האתר הציבורי נמצא בשורש; הדשבורד נמצא ב־`admin-dashboard/`. אין למזג את שתי האפליקציות.
- יעד Supabase יחיד: `utyzqpjjjwjkkdlepkag` (`yachad-bakery-admin`).
- denylist מוחלט: AM ROM `ehyiddjeiafulwsmhqbc`, CONNEX `vkcqkbgkuweldeuxnjjh`.
- אין להשתמש ב־service-role, בסיסמה או במפתח secret בקוד דפדפן או ב־Git.
- אין להריץ seed/migrations בייצור ללא משימה מפורשת וגיבוי.
- אין לשנות את זרימת WhatsApp, חוקי 70/15/0, עמוד הבית הקולנועי או מבנה הקטלוג ללא דרישה מפורשת.

## בדיקות חובה

- Public: `npm run build`, `npm run lint`, `npm audit`.
- Admin: אותן בדיקות מתוך `admin-dashboard/`.
- UI משמעותי: 390, 430, 768, 1440 ו־1920, RTL, overflow, console/network ורענון ישיר בנתיבים.
- לאחר QA חי יש להחזיר 78 מוצרים זמינים, מחירים מקוריים, ordering/delivery/pickup פעילים והודעה כבויה.

## Release

- Public Vercel: `bakery-2-0-yachad-deploy`, תיקיית שורש `.`.
- Admin Vercel: `yachad-bakery-admin`, Root Directory `admin-dashboard`.
- אין לשנות DNS, דומיין או תשלום ללא אישור מפורש.
