# מאפיית יחד — Bakery 2.0

מערכת מלאה למאפיית יחד בכפר סבא, המורכבת משתי אפליקציות React + Vite נפרדות ומפרויקט Supabase ייעודי אחד.

## קישורי ייצור

- אתר ציבורי: https://bakery-2-0-yachad-deploy.vercel.app/
- חנות: https://bakery-2-0-yachad-deploy.vercel.app/shop
- דשבורד ניהול: https://yachad-bakery-admin.vercel.app/

## מבנה הפרויקט

- תיקיית השורש — האתר הציבורי, עמוד הבית הקולנועי ו־`/shop`.
- `admin-dashboard/` — אפליקציית ניהול עצמאית.
- `supabase/` — migrations, seed, בדיקות אבטחה ותיעוד למסד המאפייה.

החנות והדשבורד אינם משתפים רכיבי UI או state. החיבור היחיד ביניהם הוא פרויקט Supabase הייעודי `utyzqpjjjwjkkdlepkag`.

## פיתוח מקומי

אתר ציבורי:

```bash
npm install
npm run dev
```

דשבורד:

```bash
cd admin-dashboard
npm install
npm run dev
```

## משתני סביבה

יש להעתיק את שמות המשתנים מקובצי `.env.example` אל קובצי `.env.local` המתעלמים ב־Git. אין להכניס service-role לדפדפן.

Public:

- `VITE_BAKERY_SUPABASE_URL`
- `VITE_BAKERY_SUPABASE_PUBLISHABLE_KEY`

Admin:

- `VITE_BAKERY_ADMIN_SUPABASE_URL`
- `VITE_BAKERY_ADMIN_SUPABASE_PUBLISHABLE_KEY`
- `VITE_BAKERY_SHARED_LOGIN_EMAIL`
- `VITE_BAKERY_SHARED_LOGIN_USERNAME`
- `VITE_BAKERY_SHARED_LOGIN_PASSWORD`

## מצב המוצר

- 78 מוצרים, 10 קטגוריות, 2 קבוצות בחירה ו־24 אפשרויות לסלט נטענים מ־Supabase.
- מחיר, מלאי יומי, סטטוס הזמנות, משלוחים, איסוף עצמי והודעות מתעדכנים באתר ללא deploy חדש.
- החנות מבצעת Realtime, refetch בחזרה לפוקוס/רשת ואימות מלא לפני פתיחת WhatsApp.
- במקרה של תקלה בנתונים החיים מוצג קטלוג JSON במצב צפייה בלבד, ללא הזמנה.
- ההזמנה נשלחת כיום ל־WhatsApp ואינה נשמרת או נשמרת כמלאי בשרת.
- החשבון המשותף הוא החלטת MVP ואינו מבחין איזה אח ביצע שינוי.

## בדיקות

```bash
npm run build
npm run lint
npm audit

cd admin-dashboard
npm run build
npm run lint
npm audit
```

ראו גם [DEPLOYMENT.md](DEPLOYMENT.md), [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) ו־[PROJECT_HANDOFF.md](PROJECT_HANDOFF.md).
