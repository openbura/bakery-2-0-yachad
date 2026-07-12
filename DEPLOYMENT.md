# Deployment — Bakery / Yachad Bakery

## פרויקטי Vercel

| אפליקציה | פרויקט | Root Directory | Build | Output | Production |
|---|---|---|---|---|---|
| Public | `bakery-2-0-yachad-deploy` | `.` | `npm run build` | `dist` | https://bakery-2-0-yachad-deploy.vercel.app |
| Admin | `yachad-bakery-admin` | `admin-dashboard` | `npm run build` | `dist` | https://yachad-bakery-admin.vercel.app |

שני הפרויקטים מוגדרים כ־Vite. `vercel.json` בכל אפליקציה מפנה נתיבי SPA ל־`index.html`, ולכן רענון ישיר ב־`/shop`, `/login`, `/products` ו־`/settings` נתמך.

## משתני סביבה ב־Vercel

Public, Preview + Production:

- `VITE_BAKERY_SUPABASE_URL`
- `VITE_BAKERY_SUPABASE_PUBLISHABLE_KEY`

Admin, Preview + Production:

- `VITE_BAKERY_ADMIN_SUPABASE_URL`
- `VITE_BAKERY_ADMIN_SUPABASE_PUBLISHABLE_KEY`
- `VITE_BAKERY_SHARED_LOGIN_EMAIL`
- `VITE_BAKERY_SHARED_LOGIN_USERNAME`
- `VITE_BAKERY_SHARED_LOGIN_PASSWORD`

הערכים אינם נשמרים ב־Git. אין להגדיר service-role בפרויקט Vite.

## תהליך release

1. ליצור גיבוי חיצוני ולוודא working tree.
2. להריץ build/lint/audit בשתי האפליקציות ו־secret scan.
3. לפרוס Preview ולבדוק `/`, `/shop` ונתיבי האדמין הישירים.
4. לפרוס Production במפורש לשני פרויקטי Vercel.
5. לבצע QA חי ולשחזר את מצב Supabase המאושר.
6. לדחוף feature branch ו־`main` ללא force.

הפרויקט הציבורי נפרס במפורש דרך Vercel CLI; push ל־GitHub לבדו אינו תחליף לאימות deployment READY.

## Supabase Auth

הדשבורד משתמש ב־email/password `signInWithPassword`, לכן אין redirect OAuth פעיל שנדרש לשינוי. אין לשנות את המשתמש, הסיסמה, RLS או billing במסגרת deploy רגיל.

## מחוץ להיקף

DNS, דומיין מותאם, תשלום ישראלי, אחסון הזמנות וניהול סטטוס הזמנה נשארו לעתיד.
