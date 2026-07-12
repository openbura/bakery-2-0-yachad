# Yachad Bakery Admin Dashboard

אפליקציית ניהול עצמאית בעברית ובכיוון RTL עבור מאפיית יחד. הדשבורד מתחבר רק לפרויקט Supabase הייעודי של המאפייה ומאפשר פעולות יומיומיות מוגבלות לפי RLS והרשאות עמודה.

## פיתוח מקומי

```bash
npm install
npm run dev
```

## בדיקות ובנייה

```bash
npm run build
npm run lint
npm run preview
```

## נתיבים

- `/login` — כניסה באמצעות Supabase Auth ו־allowlist של מנהלי המאפייה.
- `/` — דשבורד תפעולי ופעולות מהירות.
- `/products` — חיפוש, סינון, זמינות יומית ועריכת מחיר.
- `/settings` — סטטוס החנות והודעה ללקוחות.

## משתני סביבה מקומיים

העתיקו את שמות המשתנים מ־`.env.example` אל `.env.local`. ערכים אמיתיים נשארים מקומיים ומחוץ ל־Git.

- `VITE_BAKERY_ADMIN_SUPABASE_URL`
- `VITE_BAKERY_ADMIN_SUPABASE_PUBLISHABLE_KEY`
- `VITE_BAKERY_SHARED_LOGIN_EMAIL`
- `VITE_BAKERY_SHARED_LOGIN_USERNAME`
- `VITE_BAKERY_SHARED_LOGIN_PASSWORD`

הלקוח מאמת שה־URL שייך במדויק ל־`utyzqpjjjwjkkdlepkag`. אין fallback ל־mock, ל־localStorage או לפרויקט Supabase אחר. אין להשתמש במפתח secret/service-role בדפדפן.

## גבולות הרשאה

- מנהל פעיל רשאי לשנות רק `price_agorot` ו־`available_today` במוצרים.
- בהגדרות החנות ניתן לשנות רק ordering, delivery, pickup ושדות הודעת הלקוחות.
- אין יצירה/מחיקה של מוצרים, קטגוריות או אפשרויות, ואין גישה ל־source metadata.
- `audit_log` הוא append-only ונכתב רק בטריגרים של מסד הנתונים.
- `src/data/catalogSeed.json` נשאר snapshot לתיעוד ול־rollback בלבד ואינו מקור הנתונים בזמן ריצה.

האתר הציבורי וה־`/shop` עדיין אינם מחוברים ל־Supabase בשלב זה.
