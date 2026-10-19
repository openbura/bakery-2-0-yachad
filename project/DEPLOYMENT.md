> עדכון פרסום 19.10.2026: המשתמש אישר העלאה ציבורית במצב **קטלוג וסל לצפייה בלבד**. ההזמנות, הסליקה וה־Push יישארו כבויים; אין שינוי ב־Supabase החי. [פרטי הגרסה והבדיקות](./CATALOG_RELEASE_HE.md). עדכון זה גובר על הוראות הפרסום ההיסטוריות בהמשך.

> עדכון 2026-10-19: הזמנות ומעקב פועלים מקומית בלבד; המיגרציות לא הוחלו בענן. [גרסה פעילה](./ACTIVE_VERSION.md) · [בדיקות מקומיות ודרישות המשך](./ONLINE_ORDERS_LOCAL_QA_HE.md). אין לפרוס build עם מפתח הדמה או להחיל seed בדיקה על ייצור. נדרשת הרשאה נפרדת לכל שינוי מרוחק. יתר התיעוד היסטורי.

# Deployment — Bakery / Yachad Bakery

Push: קוד ה־Edge וה־SQL הוכנו לבדיקה, **לא לפריסה אוטומטית**. קראו [PUSH_LOCAL_QA_HE.md](./PUSH_LOCAL_QA_HE.md) לפני המשך. ה־VAPID private key, service key וסוד worker מיועדים לצד שרת בלבד. אין להחיל את SQL ההפעלה, להגדיר סודות בענן או לשלוח Push אמיתי ללא הרשאה מפורשת נוספת.

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
- סיסמת Supabase Auth מוקלדת במסך הכניסה; אין לשמור סיסמה במשתנה `VITE_*` ציבורי.

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
