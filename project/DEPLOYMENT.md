> 28.10.2026 — סנכרון החנות והאדמין פורסם באישור בוס ואומת בחי:222מוצרים/20קטגוריות/30קבוצות/238אפשרויות בענן. שינויי מחיר, זמינות, הודעה וסגירה נבדקו מול לשונית חנות פתוחה, וכל ערכי הבדיקה שוחזרו. חנות `dpl_2QmKZWu2GtJG9oV11B48To9XJfdh`; אדמין `dpl_HUcDn6FwvHfL1d1rDMuSM2Mjx6cm`, שניהם READY. קבלת הזמנות דרך WhatsApp בלבד; אין סליקה/כתיבת הזמנות/Push. החנות קוראת ענן (OWNER_REVIEW=false), עם Realtime, גיבוי10שניות ואימות לפני WhatsApp. חסימת שעות ישראל05–21 א׳–ה׳,05–16 שישי ושבת סגור. [דוח ובדיקות ושחזור](./LIVE_SYNC_20261028_HE.md). ההמשך היסטורי וגובר עליו עדכון זה.

> פרסום אדמין 27.10.2026 באישור בוס: נשמר החיבור באותו דפדפן, עם פקיעה אחרי 14 ימים ללא שימוש והתנתקות מהמכשיר הנוכחי בלבד. פריסה `dpl_84mqRLJ1yuiogfn8zEyAU15xPgck`, READY, ב־https://yachad-bakery-admin.vercel.app/ . בדיקות דפדפן על הגרסה החיה עברו עם Auth מדומה, ובדיקת מסך כניסה אנונימית עברה ללא mock; לא נעשה שימוש בסיסמה האמיתית. החנות ו־Supabase לא שונו. [דוח](./ADMIN_SESSION_PERSISTENCE_20261027_HE.md).

> עדכון ציבורי 27.10.2026: בוס אישר החזרת הזמנות דרך WhatsApp עד לחיבור סליקה. המסלול הוא סל → פרטי לקוח/כתובת → פתיחת הודעה מוכנה; הלקוח שולח בוואטסאפ וממתין לאישור. אין סליקה, כתיבת הזמנות למסד או Push. נותר קטלוג הגרסה המאושרת (222 מוצרים), ללא חיבור לקטלוג הענן הישן. העיר בכתובת קובעת את דמי המשלוח: כפר סבא 20 ₪, רעננה/הוד השרון/יישובי הסביבה 30 ₪. הוסרו כל כיתובי תמונת המחשה ללא שינוי במסגור. פריסה `dpl_43agxq1NeF76KS4MJgLWnLgjbbQJ` במצב READY; בדיקות ציבוריות עברו בחמישה גדלי מסך. [דוח](./WHATSAPP_CHECKOUT_20261027_HE.md). העדכון הזה גובר על מצב קטלוג בלבד ההיסטורי להלן.

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
