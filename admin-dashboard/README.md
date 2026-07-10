# Yachad Bakery Admin Dashboard

אפליקציית ניהול עצמאית, בעברית ובכיוון RTL, עבור מאפיית יחד. בשלב A הממשק משתמש ב-state מקומי וב-snapshot מקומי של קטלוג החנות הציבורית.

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

- `/login` — מסך התחברות מדומה.
- `/` — סקירה תפעולית.
- `/products` — חיפוש, סינון, זמינות ומחיר.
- `/settings` — סטטוס החנות והודעה ללקוחות.

## גבולות Stage A

- אין Auth אמיתי, Backend או חיבור ל-Supabase.
- כל שמירה מעדכנת state מקומי בלבד ואינה משנה את האתר הציבורי.
- האפליקציה מבודדת לחלוטין מאפליקציית המאפייה שנמצאת בשורש המאגר.
- `src/data/catalogSeed.json` הוא snapshot מקומי של הקטלוג הציבורי לצורכי Stage A בלבד; אין import בזמן ריצה מאפליקציית החנות.
- שמות משתני Supabase העתידיים מתועדים ב-`.env.example` ללא ערכים.

בשלב עתידי `src/auth` יוחלף בגבול Supabase Auth, ו-`src/lib` יכיל לקוח Supabase ייעודי למאפייה בלבד.
