# ביקורת פרויקט מאפיית יחד
**12 בספטמבר 2026 · סקירה והמלצות בלבד · מיועד לבוס · גרסת ייצור cc89bd5**

המערכת הקיימת בנויה היטב מבחינה חזותית ומשדרת מאפייה עם זהות משלה. איני ממליץ על בנייה מחדש או החלפת טכנולוגיות. עיקר הערך כעת נמצא באמינות ההזמנה והניהול, בהגנה על הכניסה ובנגישות ממוקדת. הדוח מכיל 32 ממצאים והזדמנויות עם ראיות, השפעה, תיקון מוצע והיקף. חלקם תקלות ששוחזרו; אחרים מגבלות MVP או החלטות שמומלץ להשאיר לפגישה.

**הדחוף ביותר:** דף הכניסה החי לאדמין מוסר לדפדפן סיסמת prefill. החשיפה נבדקה ללא כניסה לחשבון וללא הצגת הסיסמה. אם הערך הוא סיסמה תקפה, הוא מאפשר גישה לחשבון המשותף. זהו ממצא A01. לא בוצע תיקון, החלפת סיסמה או שינוי פריסה.

קוד המוצר, העיצוב, התוכן והנתונים נשארו ללא שינוי. נוצרו רק עותקי שחזור, עותק בדיקה, תיעוד, תסריטי בדיקה וצילומים. **1,474 קובצי המקור והנכסים שנכללו בגיבוי נבדקו שוב בסוף העבודה ונמצאו זהים ב־SHA-256.**

## 1. נקודת השחזור וזהות הגרסה

תיקיית השחזור: **checkpoint-20260912** לצד הדוח. הוראות מפורטות בקובץ [RESTORE.md](checkpoint-20260912/RESTORE.md); רשימת כל הקבצים, המקור וה־SHA-256 ב־[manifest.json](checkpoint-20260912/manifest.json).

| עותק בגיבוי | מה נשמר | קבצים |
| --- | --- | --- |
| source-working | קוד המקור הראשי כפי שהיה בדיסק, כולל README ששונה, תיעוד לא משויך ל־commit, רשימת תמונות חסרות וקובץ הקטלוג העריך XLSX | 523 |
| release-cc89bd5 | קוד האתר, החנות והאדמין בגרסת השחרור הנקייה; migrations, בדיקות, lockfiles, תמונות ורצפי פריימים | 521 |
| legacy-deploy-output | הפלט הסטטי הישן שנמצא בתיקיית המשימה, לשימור ולהבחנה מגרסת השחרור | 26 |
| public-release-build | תוצר הבנייה הציבורי המקומי שהיה קיים ב־release, כולל נכסיו | 404 |

[ארכיון ZIP של נקודת השחזור](BAKERY-CHECKPOINT-2026-09-12.zip) נוצר ונפתח מחדש: 1,474 רשומות התוכן נבדקו גם מתוך הארכיון, ללא אי־התאמות. [אימות הארכיון וה־SHA-256 שלו](archive-verification.json).

סה״כ: **1,474 קבצים, 111,512,392 בתים — כ־106.35 MiB**. ההעתקה אומתה קובץ־מול־קובץ; עותק קוד השחרור שימש גם לבנייה ולבדיקות המקומיות. אין צורך ב־branch כדי לשמר את השינויים הלא שמורים: תוכנם נמצא בפועל בעותק source-working.

### מצב Git שנמצא

- המקור: `C:/Users/openb/Documents/bakery-2-0-yachad-source`, ענף `codex/bakery-admin-dashboard`, ‏HEAD ‏`a2f4f0b37a4408db03c4c20cce05e9d770762779`. ‏README שונה ו־9 קבצים לא משויכים ל־commit. התוכן הדרוש לשחזור הועתק; bundle ישן של גיבוי קודם לא שוכפל.
- השחרור: `C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310`, ענף `codex/bakery-production-release`, ‏HEAD ‏`cc89bd5e29aed95e327bb1718043f11b91ea6650`. מצב נקי.
- תיקיית המשימה `bakery-2-0-yachad-deploy` אינה מאגר Git תקין: קיימת בה תיקיית .git ריקה ופלט בנוי ישן. אין לעבוד ממנה על שדרוג המוצר.
- לא בוצעו commit, שינוי branch, reset, מחיקה, push או deploy. סטטוס המקור וההיסטוריה האחרונה נשמרו בגיבוי.

### הקשר לייצור ולמה שהלקוח ראה

קריאת Vercel בזמן הביקורת אישרה שתי פריסות Production במצב READY, עם aliases פעילים ועם אותו commit ‏cc89bd5:

| חלק | כתובת פעילה | מזהה פריסה |
| --- | --- | --- |
| אתר וחנות | [האתר הציבורי](https://bakery-2-0-yachad-deploy.vercel.app/) · [החנות](https://bakery-2-0-yachad-deploy.vercel.app/shop) | dpl_eQnmoPyTocVvU3gvV54mjpRVVMQK |
| אדמין | [דף הכניסה](https://yachad-bakery-admin.vercel.app/login) | dpl_4kZZSs3eSQ98iQW9BXynpWq8JBDs |

הפריסות נוצרו ב־12.7.2026. /shop ו־/login החזירו HTTP 200 בבדיקה עכשווית. לפי דבריך הלקוח כבר ראה את האתר; אין תיעוד של זמן הביקור או כתובת הפריסה המדויקת שבה צפה, ולכן אי אפשר להוכיח שזהו בדיוק המסך שראה אז. **אפשר להוכיח שהקוד שגובּה הוא ה־commit שאליו משויכת גרסת הייצור הנוכחית.**

תוצר ה־dist המקומי אינו זהה בבתים ל־HTML/JS שבייצור: CSS תואם בשם, אך שמות חבילות JS שונים. לכן הוא מסומן בגיבוי כתוצר מקומי קיים, לא כארכיון מדויק של השרת החי. קוד השחרור, מזהי הפריסות וה־aliases תועדו בנפרד.

### גבולות הכיסוי

הגיבוי הוא **נקודת שחזור מקומית של קוד ונכסים**, לא snapshot מלא של מערכת הייצור. הוא אינו כולל:

- סודות, .env.local, סיסמאות, tokens, sessions, קובצי גישה או פרטי חשבון. תוצר האדמין הבנוי הוחרג כדי לא לשכפל את הסיסמה המשובצת. נשמרו קוד המקור ו־.env.example.
- נתוני Supabase החיים, משתמשי Auth, יומן פעולות אמיתי, הגדרות מסד מרוחקות או מצב Realtime. migrations ונתוני seed שבקוד נשמרו, אך אינם גיבוי של המידע החי.
- 70 תמונות מוצר חיצוניות, הגדרות Vercel/DNS או תוכן WhatsApp. התמונות החיצוניות נטענו בבדיקה; הן אינן נכסים מקומיים ולא הורדו לגיבוי.
- node_modules, caches, logs, היסטוריית Git מלאה וגיבויים קודמים. ה־lockfiles נשמרו. זו גם אינה הגנה מפני אובדן המחשב עצמו.

בוצעה סריקה ממוקדת כנגד הסיסמה הפרטית הידועה בקובץ המקומי וסמני private key לפני העתקה; לא נמצאו התאמות בקבצים שנשמרו. זו אינה הוכחה קריפטוגרפית להיעדר כל סוד אפשרי בכל היסטוריית הפרויקט.

## 2. מפת המערכת והמסלולים שנבדקו

האתר הציבורי והחנות הם אפליקציית React/Vite אחת. האדמין הוא אפליקציה נפרדת. שניהם משתמשים באותו פרויקט Supabase ייעודי למאפייה. האדמין כותב שדות תפעוליים מוגבלים; החנות קוראת מוצרים והגדרות, מרעננת מידע ומאמתת את הסל לפני הפקת WhatsApp. **אין שמירת הזמנות בשרת ואין סליקה.**

| חלק / מסך | יכולות קיימות | בדיקה מעשית |
| --- | --- | --- |
| / — פתיח | canvas, רצפי desktop/mobile-lite, דילוג, handoff לתוכן, reduced motion | 0/25/50/75/98% וחזרה ל־25%; 1440/768/390; תצוגה ו־RAF |
| / — תוכן | כניסה, ניווט, 6 קטגוריות שיווק, 4 תמונות ״טרי״, יתרונות, סיפור המאפייה, קשר ושעות | כל האזורים, קישורי עוגן, תפריט מובייל, Tab/Escape, צילומים |
| /shop — קטלוג | 78 מוצרים, 10 קטגוריות ו״הכל״, selector מלא במובייל | כל הסינונים; 390/430/768/1024/1440/1920; 70/70 תמונות קיימות נטענו |
| /shop — מוצר | הוספה רגילה; סלט עם 2 קבוצות ו־24 אפשרויות | הוספה, בחירה, שני הרכבים נפרדים, מקלדת בדיאלוג |
| /shop — סל | כמויות, הסרה, סיכום, דמי משלוח, מינימום, סל שולחני ומגירת מובייל | 70→140→70, הסרה, שני סלטים, פתיחה יזומה בלבד, רענון |
| /shop — פרטים | משלוח, איסוף, בניין/בית פרטי, עיר וכתובת, טלפון, הערות | משלוח 70+15=85; הזמנה מתחת ל־70 חסומה למשלוח; איסוף 10+0=10 |
| /shop — סיום | העתקה ואימות חי לפני WhatsApp | טקסט נוצר ונלכד בזיכרון בלבד; בניין, בית פרטי, איסוף, עיר ״אחר״, מחיר/זמינות שהשתנו |
| אדמין /login | כניסה, שגיאה, allowlist, שחזור session, יציאה | דף חי ללא כניסה; login/restore/logout/חשבון לא פעיל מדומים |
| אדמין / | מצב פתיחה, משלוח, איסוף, הודעה, ספירת זמינות ופעולות מהירות | מסך ושינויים בזיכרון; מצבי שילוב לא תקינים; כל רוחבי האדמין |
| אדמין /products | חיפוש, קטגוריה, זמינות, עריכת מחיר, מצבי ריקנות | חיפוש/סינון, מחיר פסיק/נקודה/שגוי, הצלחה, כשל, כתיבה שנייה בזמן הראשונה |
| אדמין /settings | מצבי הזמנה וקבלה, הודעת לקוחות, preview ושמירה | ולידציה, טיוטה, כשל, הודעת closed, התנגשות בין מנהלים ופוקוס |

אין מסכים נוספים של ניהול הזמנות, סטטוסים, תשלום, יצירת מוצר, החלפת תמונות, עריכת דף הבית, ניהול קטגוריות או היסטוריית פעולות באדמין. אין דף מוצר נפרד בחנות או חיפוש בחנות. אלה מגבלות המערכת כפי שנבנתה; אינן מעידות על מסכים שבורים.

**הגנות הבדיקה:** קריאת הייצור הוגבלה ל־GET/HEAD ולתוכן ציבורי. בתרחישים המקומיים כל Supabase/Auth יורטו לנתונים בזיכרון, WebSocket נחסם, ופתיחת WhatsApp/העתקה נתפסו לפני יציאה מהדפדפן. באדמין בוצעו 10 ניסיונות PATCH מדומים בהרצות הסופיות, מתוכם 3 כשלים יזומים; אפס כתיבות אמיתיות. לא נרכשה הזמנה ולא נשלחה הודעה.

לא אומתו: התחברות אמיתית לאדמין, כתיבה חיה והרשאות RLS פרוסות, Audit trigger בייצור, סנכרון חי בין שני מכשירים, קבלת ההודעה אצל המאפייה, WhatsApp במכשיר פיזי, מקלדת/overscroll בטלפון אמיתי, קורא מסך מלא, מדדי רשת סלולרית ונתוני Core Web Vitals מהשטח. קישורי טלפון/מפות/Instagram/WhatsApp נבדקו כיעדי ממשק ולא הופעלו כשיחות או הודעות.

## 3. מה כבר מוצלח וראוי לשימור

- **זהות עקבית:** צבעי קרם, אספרסו וקרמל; שילוב פונטים עברי מכוון; תמונות אוכל תופסות מקום נכון. האתר, החנות והאדמין מרגישים שייכים לאותו עסק.
- **הפתיח הוא נכס קיים:** קומפוזיציה שונה למובייל, פריימים מקומיים, דילוג וחלופה סטטית לתנועה מופחתת. תמונות החזרה ל־25% זהות ב־SHA-256 לתמונות ההתקדמות באותו מיקום בשלושת הרוחבים. אין הצדקה להחליפו.
- **רספונסיביות אמיתית:** החנות עוברת לכרטיסים אופקיים בטלפון; האדמין מציג כרטיסי מוצרים וניווט תחתון. לא נמצאה גלישה אופקית במטריצות שנבדקו.
- **כסף והזמנה:** חישוב באגורות, כללי 70/15/0, reconciliation, בדיקה מחדש לפני WhatsApp, עצירה במחיר שהשתנה וסימון מוצר שאזל — פועלים. הדוגמה של שינוי 10→12 ₪ חסמה את השליחה הראשונה והפיקה סכום 12 ₪ רק באישור השני.
- **כשל מידע מנוהל בזהירות:** אין מעבר שקט להזמנה במחירי fallback. אפשר לעיין בתפריט, אך ההזמנה חסומה עד שיש מידע חי. retry התאושש בהדמיה.
- **אדמין ממוקד:** מסכים מועטים, חיפוש וסינון טובים, הודעות בעברית, שחזור חיבור, ניסיון חוזר והחזקת טיוטה בכשל שמירה.
- **הרשאות בקוד:** RLS, allowlist לפי המשתמש, הגבלת כתיבה למחיר/זמינות ולשדות תפעוליים, ויומן append-only מטריגרים. זו תשתית חיובית; ממצא הסיסמה מחליש את גבול הכניסה ואינו מבטל את הצורך בתשתית זו.

אין צורך להוסיף אנימציות, להחליף את הפונטים, לייבא מערכת עיצוב חדשה או להעביר את האתר לטכנולוגיה אחרת כדי לטפל בממצאים.

## 4. ממצאים מפורטים

P0 = חשיפה דחופה. P1 = תקלה שעלולה לעצור הזמנה, להטעות במחיר או לאבד פעולת ניהול. P2 = שיפור משמעותי באמינות, שימושיות, נגישות או תחזוקה. P3 = ליטוש או החלטת מוצר. הערכות המאמץ הן סדר גודל למפתח שמכיר את הפרויקט, עם QA ממוקד; תלויות בזמינות החלטות ותוכן מהבעלים.

### אתר ציבורי

#### H01 — תפריט המובייל משאיר את הרקע פעיל למקלדת

**P2 · נגישות ששוחזרה בדפדפן · 0.5 יום**

**מה נמצא:** רצף Tab יצא מקישורי התפריט לקישורי האתר שמאחורי השכבה הכהה. במצב הכותרת הלא צמודה, הפאנל מכסה גם את כפתור הפתיחה/סגירה שבכותרת. Escape ולחיצה בחוץ עובדים.

**השפעה:** קשה להתמצא ולסגור את התפריט באמצעות מקלדת, והפוקוס מגיע לתוכן שאינו נראה במלואו.

**המלצה:** להוסיף פוקוס ותחימה בהתאם להתנהגות התפריט, להחזיר פוקוס לכפתור הפתיחה ולהציג כפתור סגירה ברור בתוך הפאנל.

**מועד:** לפני הפגישה אם מתבצע סבב נגישות.

**מקור:** [src/App.tsx:996](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/src/App.tsx:996>) · [src/App.tsx:1114](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/src/App.tsx:1114>). [צילום מסך](<C:/Users/openb/.codex/visualizations/2026/09/12/01a09487-2a47-7122-882e-f285e50faaa2/bakery-audit-20260912/screenshots/home-390-menu.png>)

#### H02 — כרטיסי קטגוריות נראים ומתנהגים כמוקדי אינטראקציה ללא פעולה

**P2 · נגישות ושימושיות מאומתות · 1–3 שעות לתיקון; 0.5 יום לקישור קטגוריות**

**מה נמצא:** ששת כרטיסי הקטגוריות הם ARTICLE עם tabIndex=0 שנוצר עקב whileTap. לחיצה או Enter אינם פותחים קטגוריה; יש רק CTA כללי לחנות.

**השפעה:** משתמש מקלדת עוצר שש פעמים על פריטים שלא עושים דבר; משתמש עכבר מצפה לפעולה בגלל התגובה החזותית.

**המלצה:** כעת להסיר תגובת לחיצה ותחנות פוקוס מכרטיס תיאורי. לאחר אישור מיפוי בין שש קטגוריות השיווק לעשר קטגוריות החנות, אפשר להפוך אותם לקישורים אמיתיים.

**מועד:** תחנות סרק לפני הפגישה; מיפוי לאחריה.

**מקור:** [src/App.tsx:1222](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/src/App.tsx:1222>). [צילום מסך](<C:/Users/openb/.codex/visualizations/2026/09/12/01a09487-2a47-7122-882e-f285e50faaa2/bakery-audit-20260912/screenshots/home-390-categories.png>)

#### H03 — ניגודיות חלשה בכפתורים הזהובים

**P2 · נגישות; דגימת צילום וקוד · 1–3 שעות**

**מה נמצא:** במובייל הטקסט הבהיר הקטן בסרגל התחתון נמצא על רקע זהב. דגימה מקומית ליד הטקסט נתנה בקירוב 2.64–4.02:1, ובכפתור הקשר 2.84–3.26:1. אלה דגימות לגרדיאנט, לא מדידת אתר מלאה.

**השפעה:** קריאה קשה יותר בשמש או ללקוח עם ראייה חלשה, דווקא בפעולות הזמנה חשובות.

**המלצה:** להכהות את הרקע באזור הטקסט או להשתמש בטקסט אספרסו. לבדוק את כל מצבי הכפתור ולשמר את פלטת המאפייה.

**מועד:** לפני הפגישה.

**מקור:** [src/styles.css:809](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/src/styles.css:809>) · [src/styles.css:4354](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/src/styles.css:4354>). [צילום מסך](<C:/Users/openb/.codex/visualizations/2026/09/12/01a09487-2a47-7122-882e-f285e50faaa2/bakery-audit-20260912/screenshots/home-390-contact.png>)

#### H04 — לולאת הפתיח ממשיכה לפעול בזמן עצירה באמצעו

**P2 · ביצועים; מדידת runtime מקומית · 0.5 יום ועוד בדיקת רגרסיה ממוקדת**

**מה נמצא:** ב־25%–75% לאחר התייצבות הגלילה נמדדו כ־60–61 callbacks של RAF בשנייה ב־1440/768/390. בתחילת הפתיח נמדדו אפס. לא נמדדה צריכת סוללה או הוכח שכל callback מבצע ציור כבד.

**השפעה:** קיימת פעילות מיותרת כשהתמונה יציבה. זו הזדמנות להפחתת עבודה בלי שינוי האפקט שאושר.

**המלצה:** להרדים את הלולאה כשהיעד והפריים המוצג מתייצבים בכל התקדמות, ולהעיר בקלט חדש. להשוות את אותם פריימים, גלילה הפוכה והעברת השליטה לתוכן לפני אישור.

**מועד:** אחרי תקלות תפעוליות; לשמר פתיח מאושר.

**מקור:** [src/App.tsx:907](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/src/App.tsx:907>). [צילום מסך](<C:/Users/openb/.codex/visualizations/2026/09/12/01a09487-2a47-7122-882e-f285e50faaa2/bakery-audit-20260912/screenshots/home-1440-intro-50.png>)

#### H05 — תנועת תפריט המובייל אינה מכבדת reduced motion

**P2 · נגישות תנועה ששוחזרה · 1–2 שעות**

**מה נמצא:** במצב reduced motion הפתיח הסטטי עובד כראוי ולא מבקש פריימים. התפריט עדיין עובר translate/scale במשך כ־430ms.

**השפעה:** העדפת המשתמש להפחתת תנועה נשמרת בחלק הבולט של האתר אך אינה עקבית בניווט.

**המלצה:** להחיל reduced motion גם על וריאציות ותזמוני התפריט, עם פתיחה מיידית או שינוי שקיפות מינימלי.

**מועד:** עם H01.

**מקור:** [src/App.tsx:214](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/src/App.tsx:214>) · [src/App.tsx:1131](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/src/App.tsx:1131>). [צילום מסך](<C:/Users/openb/.codex/visualizations/2026/09/12/01a09487-2a47-7122-882e-f285e50faaa2/bakery-audit-20260912/screenshots/home-390-reduced-menu.png>)

#### H06 — הסימון הפעיל בניווט אינו מתעדכן בקטגוריות

**P3 · באג ליטוש ששוחזר בדסקטופ · 1–2 שעות**

**מה נמצא:** לחיצה על ״מה תמצאו אצלנו״ מגיעה למקטע הנכון אך הסימון נשאר ״דף הבית״. יתר קישורי fresh/visit/home שנבדקו סומנו נכון. המקטע גבוה ביחס לחלון ולסף IntersectionObserver.

**השפעה:** אי־התאמה קטנה בין מיקום המבקר לבין המשוב בתפריט.

**המלצה:** לעדכן את שיטת זיהוי המקטע הפעיל כך שלא תדרוש אחוז חיתוך בלתי אפשרי במקטעים גבוהים.

**מועד:** ליטוש אופציונלי.

**מקור:** [src/App.tsx:230](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/src/App.tsx:230>). [צילום מסך](<C:/Users/openb/.codex/visualizations/2026/09/12/01a09487-2a47-7122-882e-f285e50faaa2/bakery-audit-20260912/screenshots/home-1440-categories.png>)


### חנות

#### S01 — כיבוי משלוחים חוסם גם הזמנה חדשה לאיסוף

**P1 · באג ששוחזר בדפדפן עם נתוני בדיקה · 0.5 יום**

**מה נמצא:** הוגדר בזיכרון delivery=false ו־pickup=true. הוצגה הודעה שאפשר איסוף, אך נמצאו 0 כפתורי הוספה פעילים ו־0 בוררי איסוף בסל הריק. ברירת המחדל היא משלוח; בורר הקבלה מופיע רק אחרי הוספה.

**השפעה:** מצב תפעולי לגיטימי של המאפייה מונע מכל לקוח חדש להתחיל הזמנת איסוף.

**המלצה:** להציג בחירת קבלה לפני הפריט הראשון. אם האמצעי הנבחר הושבת ונשאר אמצעי אחד פעיל, לעבור אליו באופן ברור ולבצע reconciliation. לבדוק גם שינוי מצב בזמן שסל קיים.

**מועד:** לפני הפגישה.

**מקור:** [src/ShopPage.tsx:291](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/src/ShopPage.tsx:291>) · [src/ShopPage.tsx:340](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/src/ShopPage.tsx:340>) · [src/ShopPage.tsx:1492](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/src/ShopPage.tsx:1492>). [צילום מסך](<C:/Users/openb/.codex/visualizations/2026/09/12/01a09487-2a47-7122-882e-f285e50faaa2/bakery-audit-20260912/screenshots/shop-pickup-only-deadend-1440.png>) [נתוני בדיקה](<C:/Users/openb/.codex/visualizations/2026/09/12/01a09487-2a47-7122-882e-f285e50faaa2/bakery-audit-20260912/shop-flow-results.json>)

#### S02 — הכפתור המושבת מונע מהלקוח לקבל הסבר על שדה שגוי

**P2 · שימושיות וולידציה; שוחזר בדפדפן · 2–4 שעות**

**מה נמצא:** בפרטי הזמנה הוזן טלפון ״12״ ונעזב השדה: לא הופיעה שגיאת שדה. כפתור WhatsApp היה מושבת. שגיאות נוצרות ב־submit, אך canSendOrder מונע את פעולת השליחה במצב שגוי.

**השפעה:** לקוח רואה כפתור אפור ונדרש לנחש מה חסר או אינו תקין, במיוחד בטופס המשלוח הארוך.

**המלצה:** לאפשר ניסיון שליחה שמציג שגיאות ומעביר פוקוס לשדה הראשון, או להוסיף ולידציה ב־blur עם סיכום ברור. לשמר את חסימת שליחת ההזמנה בפועל עד שכל הנתונים תקינים.

**מועד:** לפני הפגישה.

**מקור:** [src/ShopPage.tsx:377](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/src/ShopPage.tsx:377>) · [src/ShopPage.tsx:804](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/src/ShopPage.tsx:804>) · [src/ShopPage.tsx:1547](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/src/ShopPage.tsx:1547>). [צילום מסך](<C:/Users/openb/.codex/visualizations/2026/09/12/01a09487-2a47-7122-882e-f285e50faaa2/bakery-audit-20260912/screenshots/shop-checkout-disabled-validation-1440.png>)

#### S03 — מחיר יחסי ל־100 גרם/מ״ל אינו מתעדכן עם המחיר הראשי

**P1 · באג מידע כספי ששוחזר בסיכום הזמנה מדומה · 0.5–1.5 ימים, לפי זמינות נתוני היחידות**

**מה נמצא:** מחיר מים שונה בזיכרון מ־10 ל־12 ₪. החנות עצרה את השליחה הראשונה וביקשה אישור מחודש — נכון. בשליחה השנייה הסיכום כלל 12 ₪ אך עדיין ״₪2 / 100 מל׳״. price_unit_note מגיע כמחרוזת מקור בלתי מחושבת.

**השפעה:** הקונה רואה שתי אמירות מחיר לא עקביות. אותה בעיה קיימת במוצרים נוספים שהערת היחידה שלהם כוללת מחיר.

**המלצה:** להפריד משקל/נפח ויחידת מכירה לנתונים מובנים, ולחשב מחיר יחסי מהמחיר העדכני. עד לאישור נתוני יחידה, לבחור במפורש איך להציג רק מידע אמין; לא להמציא משקל או לשנות מדיניות תמחור.

**מועד:** לפני שימוש בשינוי מחירים; עדיף לפני הפגישה.

**מקור:** [src/ShopPage.tsx:99](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/src/ShopPage.tsx:99>) · [src/services/publicShopRepository.ts:146](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/src/services/publicShopRepository.ts:146>) · [src/services/publicShopRepository.ts:154](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/src/services/publicShopRepository.ts:154>). [נתוני בדיקה](<C:/Users/openb/.codex/visualizations/2026/09/12/01a09487-2a47-7122-882e-f285e50faaa2/bakery-audit-20260912/shop-flow-final-check.json>)

#### S04 — בחירת ״אחר״ אינה אוספת את שם העיר

**P2 · באג מידע בהזמנה ששוחזר בדפדפן · 1–3 שעות**

**מה נמצא:** במשלוח לבית פרטי נבחרה העיר ״אחר״. לא הופיע שדה עיר נוסף. סיכום WhatsApp המדומה כלל ״עיר: אחר / בדיקה מול המאפייה״, בלי שם היישוב האמיתי.

**השפעה:** המאפייה צריכה לבקש שוב פרט בסיסי כדי להחליט אם ניתן לספק את ההזמנה.

**המלצה:** כשנבחר ״אחר״ להציג שדה יישוב נדרש ולצרפו לסיכום לצד ההודעה שאזור המשלוח טעון אישור. להשאיר אזורי שירות ועמלות לפי החלטת הבעלים.

**מועד:** לפני הפגישה.

**מקור:** [src/ShopPage.tsx:79](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/src/ShopPage.tsx:79>) · [src/ShopPage.tsx:1222](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/src/ShopPage.tsx:1222>) · [src/ShopPage.tsx:925](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/src/ShopPage.tsx:925>). [נתוני בדיקה](<C:/Users/openb/.codex/visualizations/2026/09/12/01a09487-2a47-7122-882e-f285e50faaa2/bakery-audit-20260912/shop-flow-recheck.json>)

#### S05 — רענון הדף מוחק סל והתקדמות הזמנה

**P2 · שימושיות; שוחזר בדפדפן · 0.5–1 יום**

**מה נמצא:** אחרי הכנת הזמנת איסוף והפקת סיכום, רענון החזיר ״ההזמנה שלך ריקה״. הסל והפרטים מוחזקים ב־React state; הקישור לאתר המאפייה מבצע ניווט מלא.

**השפעה:** הלקוח עלול לאבד עבודה בעקבות רענון, ניווט לאתר או חזרה מהטלפון.

**המלצה:** לשמור סל גרסאי ב־sessionStorage ולבצע אימות מחירים וזמינות בשחזור. לקבל בנפרד החלטה אם ולכמה זמן לשמור פרטים אישיים; אין צורך לשמור אותם כדי לפתור אובדן סל.

**מועד:** ערך גבוה; אחרי התקלות התפעוליות.

**מקור:** [src/ShopPage.tsx:288](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/src/ShopPage.tsx:288>) · [src/ShopPage.tsx:978](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/src/ShopPage.tsx:978>). [נתוני בדיקה](<C:/Users/openb/.codex/visualizations/2026/09/12/01a09487-2a47-7122-882e-f285e50faaa2/bakery-audit-20260912/shop-flow-final-check.json>)

#### S06 — דיאלוג הסלט והסל הסגור אינם מנהלים פוקוס כראוי

**P2 · נגישות; שוחזר במקלדת · 0.5–1 יום**

**מה נמצא:** פתיחת הסלט לא העבירה אליו פוקוס ו־Escape לא סגר אותו. במובייל, Tab מהפריט האחרון הגיע לכפתור ״סגור הזמנה״ בסל הסגור, ב־y=881 כאשר גובה המסך 844. בורר הקטגוריות כבר כולל מנגנון דיאלוג מפותח יותר.

**השפעה:** משתמש מקלדת מאבד את מקומו או מגיע לפעולות בלתי נראות; aria-modal לבדו אינו מונע גישה לרקע.

**המלצה:** להוסיף פוקוס ראשוני, תחימת Tab, Escape והחזרת פוקוס. להסיר את הסל הסגור מסדר הפוקוס באמצעות inert/hidden בהתאם ל־breakpoint, ולנהל את הרקע בזמן פתיחה.

**מועד:** לפני הפגישה אם אפשר; לפני בדיקת נגישות מסודרת.

**מקור:** [src/ShopPage.tsx:1418](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/src/ShopPage.tsx:1418>) · [src/ShopPage.tsx:1635](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/src/ShopPage.tsx:1635>) · [src/styles.css:3535](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/src/styles.css:3535>). [צילום מסך](<C:/Users/openb/.codex/visualizations/2026/09/12/01a09487-2a47-7122-882e-f285e50faaa2/bakery-audit-20260912/screenshots/shop-salad-options-390.png>) [נתוני בדיקה](<C:/Users/openb/.codex/visualizations/2026/09/12/01a09487-2a47-7122-882e-f285e50faaa2/bakery-audit-20260912/shop-extra-results.json>)

#### S07 — תקלה במידע החי מתורגמת ל״אזל להיום״ בכל המוצרים

**P2 · מסר שגוי בזמן כשל; שוחזר בהדמיית 503 · 2–4 שעות**

**מה נמצא:** בעת outage הופיע ההסבר הנכון שהמידע החי לא זמין, אך גם 156 מופעים של ״אזל להיום״ — תג וכפתור בכל אחד מ־78 המוצרים. לאחר החזרת השירות המדומה וניסיון חוזר, החנות התאוששה.

**השפעה:** לקוח עלול להבין שכל מלאי המאפייה אזל, כשהבעיה היא בחיבור בלבד.

**המלצה:** להפריד מצב ״לא ניתן לאמת זמינות״ ממצב ״אזל״. להשאיר את התפריט לעיון ואת ההזמנה חסומה עד חזרת המידע החי.

**מועד:** לפני הפגישה או בסבב האמינות הראשון.

**מקור:** [src/services/publicShopRepository.ts:197](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/src/services/publicShopRepository.ts:197>) · [src/ShopPage.tsx:1091](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/src/ShopPage.tsx:1091>) · [src/ShopPage.tsx:1130](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/src/ShopPage.tsx:1130>). [צילום מסך](<C:/Users/openb/.codex/visualizations/2026/09/12/01a09487-2a47-7122-882e-f285e50faaa2/bakery-audit-20260912/screenshots/shop-offline-390.png>) [נתוני בדיקה](<C:/Users/openb/.codex/visualizations/2026/09/12/01a09487-2a47-7122-882e-f285e50faaa2/bakery-audit-20260912/shop-flow-recheck.json>)

#### S08 — טוסט בהרכבה ופיצה עם תוספת מתווספים ללא בחירה

**P2 · מגבלת MVP מתועדת; נדרשת החלטה עסקית · 0.5–1 יום אחרי קבלת חוזה אפשרויות**

**מה נמצא:** הקטלוג מכיל ״טוסט בהרכבה״ ו״פיצה משפחתית + תוספת״, אך בחירה מובנית קיימת רק לסלט. החוזה מתעד במפורש שאין עדיין מידע מאושר על האפשרויות למוצרים אלה.

**השפעה:** שם המוצר מבטיח בחירה שהחנות אינה אוספת; יש צורך בהשלמה מול המאפייה.

**המלצה:** בפגישה לאשר מרכיבים, בחירות ומחירים, או להבהיר ליד המוצר שהבחירה תושלם מול המאפייה. אין ליצור רשימת תוספות מהשערה.

**מועד:** לאחר פידבק הלקוח.

**מקור:** [supabase/PUBLIC_CATALOG_CONTRACT.md:20](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/supabase/PUBLIC_CATALOG_CONTRACT.md:20>) · [product-catalog-yachad.json:295](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/product-catalog-yachad.json:295>) · [product-catalog-yachad.json:827](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/product-catalog-yachad.json:827>).

#### S09 — חסרים פרטי מוצר ותמונות בחלק מהקטלוג

**P2 · פער תוכן מאומת; ליטוש לפי סדר מכירות · 2–4 שעות הטמעה לכל אצווה קטנה, בנוסף להכנת התוכן**

**מה נמצא:** בצילום המצב הציבורי יש 8 מוצרים ללא image_url ו־61 ללא description_he. כל 70 כתובות התמונה הקיימות נטענו בהצלחה בבדיקה מלאה. אין דפי מוצר נפרדים; רוב ההחלטה מתקבלת בכרטיס.

**השפעה:** קשה יותר להבין משקל, תכולה ואופי מוצר, בעיקר בעוגות ועוגיות דומות. placeholder הוא טיפול סביר בחוסר, אבל אינו מסייע לבחור.

**המלצה:** לבקש מבעל המאפייה תמונות מורשות ופרטים קצרים למוצרים החשובים: מה מקבלים, יחידת מכירה ומידע רכיבים מאושר. אין להמציא אלרגנים, כשרות או טענות ״ללא״.

**מועד:** לאחר הפגישה.

**מקור:** [src/ShopPage.tsx:1071](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/src/ShopPage.tsx:1071>) · [product-catalog-yachad.json:1](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/product-catalog-yachad.json:1>). [צילום מסך](<C:/Users/openb/.codex/visualizations/2026/09/12/01a09487-2a47-7122-882e-f285e50faaa2/bakery-audit-20260912/screenshots/shop-healthy-1440.png>) [נתוני בדיקה](<C:/Users/openb/.codex/visualizations/2026/09/12/01a09487-2a47-7122-882e-f285e50faaa2/bakery-audit-20260912/public-fixtures.json>)

#### S10 — הערות חובה וחיפוש חסר מוסיפים חיכוך

**P3 · הזדמנות שימושיות, לא רגרסיה · 1–2 שעות להערות; 0.5 יום לחיפוש**

**מה נמצא:** הערות נדרשות גם בהזמנת איסוף פשוטה; זהו כלל קיים ומתועד. לחנות 78 מוצרים ומסנני קטגוריה עובדים, אך אין חיפוש לפי שם.

**השפעה:** לקוח ללא הערות נדרש להקליד טקסט כדי להתקדם; לקוח שמכיר שם מוצר צריך לעבור בין קטגוריות או לגלול.

**המלצה:** לשאול בפגישה אם הערות יכולות להיות רשות. אם הלקוחות חוזרים למוצרים ידועים, להוסיף חיפוש מקומי קטן ששומר את סינון הקטגוריות. אין צורך במנוע חיפוש חיצוני.

**מועד:** לאחר החלטת הבעלים.

**מקור:** [src/ShopPage.tsx:1392](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/src/ShopPage.tsx:1392>) · [src/ShopPage.tsx:1040](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/src/ShopPage.tsx:1040>). [צילום מסך](<C:/Users/openb/.codex/visualizations/2026/09/12/01a09487-2a47-7122-882e-f285e50faaa2/bakery-audit-20260912/screenshots/shop-checkout-pickup-390.png>)


### אדמין

#### A01 — סיסמת הכניסה מגיעה לדפדפן ולשדה מלא מראש

**P0 · חשיפת מידע מאומתת; תוקף ההרשאה לא נבדק · 0.5–1 יום, כולל אימות ופריסה מאושרת**

**מה נמצא:** בדף /login החי, בהקשר דפדפן חדש וללא כניסה, passwordPreFilled=true. הקוד קורא VITE_BAKERY_SHARED_LOGIN_PASSWORD, מחזיר אותו מ־getLoginPrefill ומעבירו ל־LoginPage. לא הוצג או נשמר ערך הסיסמה בראיות, ולא נשלחה בקשת התחברות אמיתית.

**השפעה:** מבקר מקבל את ערך סיסמת ה־prefill. אם זו סיסמת החשבון הפעיל, גבול הכניסה לאדמין נפרץ גם כאשר RLS וה־allowlist תקינים. עצם החשיפה מאומתת; לא נטען שבוצעה השתלטות או שנבדקה תקפות הסיסמה.

**המלצה:** לאחר אישור נפרד: להסיר סיסמה מה־build ומהמילוי, להשאיר הזנה רגילה או מנהל סיסמאות; להחליף את הסיסמה שנחשפה, לטפל ב־sessions ובפריסות קודמות שמכילות אותה. שינוי שם המשתנה לבדו אינו פתרון אם הערך עדיין נשלח ללקוח.

**מועד:** ראשון לטיפול; לפני שימוש תפעולי נוסף ולפני הפגישה.

**מקור:** [admin-dashboard/src/config/bakeryEnvironment.ts:33](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/admin-dashboard/src/config/bakeryEnvironment.ts:33>) · [admin-dashboard/src/services/authService.ts:36](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/admin-dashboard/src/services/authService.ts:36>) · [admin-dashboard/src/pages/LoginPage.tsx:14](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/admin-dashboard/src/pages/LoginPage.tsx:14>). [נתוני בדיקה](<C:/Users/openb/.codex/visualizations/2026/09/12/01a09487-2a47-7122-882e-f285e50faaa2/bakery-audit-20260912/browser-baseline.json>)

#### A02 — פעולות מהירות מאפשרות חנות פתוחה ללא משלוח וללא איסוף

**P1 · באג ששוחזר בדפדפן מדומה · 2–4 שעות**

**מה נמצא:** כיבוי שני המתגים בדשבורד השאיר ordering=true, delivery=false, pickup=false והכותרת נשארה ״החנות פתוחה להזמנות״. מסך ההגדרות חוסם בדיוק אותו שילוב.

**השפעה:** בעל המאפייה מקבל סטטוס מטעה; החנות הציבורית אינה מאפשרת הוספה. יש שני מסלולי שמירה עם כללי תקינות שונים.

**המלצה:** להחיל ולידציה תפעולית אחת על פעולות מהירות ועל ההגדרות. כשמכבים את אמצעי הקבלה האחרון, להציע במפורש סגירת הזמנות או ביטול הפעולה.

**מועד:** לפני הפגישה; יחד עם S01.

**מקור:** [admin-dashboard/src/App.tsx:261](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/admin-dashboard/src/App.tsx:261>) · [admin-dashboard/src/pages/SettingsPage.tsx:24](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/admin-dashboard/src/pages/SettingsPage.tsx:24>). [צילום מסך](<C:/Users/openb/.codex/visualizations/2026/09/12/01a09487-2a47-7122-882e-f285e50faaa2/bakery-audit-20260912/screenshots/admin-open-with-no-fulfillment.png>) [נתוני בדיקה](<C:/Users/openb/.codex/visualizations/2026/09/12/01a09487-2a47-7122-882e-f285e50faaa2/bakery-audit-20260912/admin-browser-qa.json>)

#### A03 — שמירת הודעה ממסך ישן דורסת הגדרה ששינה מנהל אחר

**P1 · באג ששוחזר בדפדפן מדומה · 1–2 ימים**

**מה נמצא:** מסך הגדרות נפתח כשהמשלוחים פעילים. מצב השירות המדומה שונה למשלוחים מושהים. חזרה לפוקוס לא גרמה לקריאה חדשה. שמירת הודעה בלבד שלחה שוב delivery_enabled=true ופתחה את המשלוחים.

**השפעה:** בעלים שעובדים משני טלפונים יכולים לבטל בשוגג זה את ההחלטות של זה, בלי אזהרה ובלי פעולה מכוונת על המתג.

**המלצה:** לשלוח רק שדות שנערכו, להוסיף רענון בפוקוס או Realtime, ולזהות התנגשות לפי updated_at/גרסה גולמית. לא לדרוס טיוטה מקומית בזמן רענון.

**מועד:** לפני הפגישה או לכל המאוחר לפני ניהול משני מכשירים.

**מקור:** [admin-dashboard/src/App.tsx:50](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/admin-dashboard/src/App.tsx:50>) · [admin-dashboard/src/App.tsx:217](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/admin-dashboard/src/App.tsx:217>) · [admin-dashboard/src/services/storeSettingsRepository.ts:89](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/admin-dashboard/src/services/storeSettingsRepository.ts:89>). [נתוני בדיקה](<C:/Users/openb/.codex/visualizations/2026/09/12/01a09487-2a47-7122-882e-f285e50faaa2/bakery-audit-20260912/admin-browser-qa.json>)

#### A04 — עריכת מחיר שנייה יכולה להיסגר בלי להישמר

**P1 · באג ששוחזר בדפדפן מדומה עם רשת מושהית · 0.5 יום**

**מה נמצא:** בזמן שמירת מוצר א׳ נפתח חלון מחיר של מוצר ב׳ ונשלח מחיר 88 ₪. החלון נסגר; המוצר נשאר 70 ₪; נרשמה רק הכתיבה של מוצר א׳. הממשק מאפשר את הפעולה אך savingProductId גורם לחזרה שקטה מהשמירה.

**השפעה:** מנהל עסוק חושב שמחיר או זמינות עודכנו, כשהפעולה נעלמה. זו תקלה מהותית באמינות פעולות הניהול.

**המלצה:** לנהל שמירה לכל מוצר או תור שמירות; לחלופין להשבית בעקביות את כל הפעולות החסומות ולהציג סיבה. חלון ייסגר רק אחרי אישור כתיבה של אותו מוצר.

**מועד:** לפני הפגישה.

**מקור:** [admin-dashboard/src/App.tsx:171](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/admin-dashboard/src/App.tsx:171>) · [admin-dashboard/src/App.tsx:187](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/admin-dashboard/src/App.tsx:187>) · [admin-dashboard/src/pages/ProductsPage.tsx:63](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/admin-dashboard/src/pages/ProductsPage.tsx:63>) · [admin-dashboard/src/components/PriceDialog.tsx:41](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/admin-dashboard/src/components/PriceDialog.tsx:41>). [נתוני בדיקה](<C:/Users/openb/.codex/visualizations/2026/09/12/01a09487-2a47-7122-882e-f285e50faaa2/bakery-audit-20260912/admin-browser-qa.json>)

#### A05 — סוג הודעה ״החנות סגורה״ אינו סוגר הזמנות

**P2 · שימושיות תפעולית; שוחזר בדפדפן · 1–3 שעות**

**מה נמצא:** נשמרה בזיכרון הודעה מסוג closed. ordering_enabled נשאר true. הטקסט בבורר אומר ״החנות סגורה — הזמנות אינן מתקבלות״, אבל סוג ההודעה משפיע רק על ההצגה.

**השפעה:** המנהל עשוי לחשוב שסגר את ההזמנות כשהוא רק פרסם הודעה.

**המלצה:** להבהיר שהבחירה משנה רק את ההודעה, או להציע פעולה משולבת מפורשת. לא לשנות אוטומטית את מצב ההזמנות בלי החלטה עסקית.

**מועד:** לפני הפגישה.

**מקור:** [admin-dashboard/src/pages/SettingsPage.tsx:15](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/admin-dashboard/src/pages/SettingsPage.tsx:15>) · [src/ShopPage.tsx:1016](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/src/ShopPage.tsx:1016>). [נתוני בדיקה](<C:/Users/openb/.codex/visualizations/2026/09/12/01a09487-2a47-7122-882e-f285e50faaa2/bakery-audit-20260912/admin-browser-qa.json>)

#### A06 — טיוטת ההגדרות אובדת בניווט

**P2 · שימושיות; שוחזר בדפדפן · 2–4 שעות**

**מה נמצא:** נכתבה הודעה חדשה, בוצע מעבר למוצרים וחזרה. הטיוטה חזרה לערך השמור ללא התראה. בכשל שמירה הטיוטה כן נשמרת — זו התנהגות טובה לשימור.

**השפעה:** פעולה יומיומית של בעל המאפייה יכולה להימחק בגלל מעבר מסך לפני שמירה.

**המלצה:** להתריע ביציאה עם שינויים לא שמורים, עם בחירה בין המשך עריכה ליציאה. לשקול שמירת טיוטה במעטפת בלי לשלוח אותה למסד.

**מועד:** לפני הפגישה אם משפרים את מסך ההגדרות.

**מקור:** [admin-dashboard/src/pages/SettingsPage.tsx:19](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/admin-dashboard/src/pages/SettingsPage.tsx:19>) · [admin-dashboard/src/App.tsx:39](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/admin-dashboard/src/App.tsx:39>). [נתוני בדיקה](<C:/Users/openb/.codex/visualizations/2026/09/12/01a09487-2a47-7122-882e-f285e50faaa2/bakery-audit-20260912/admin-browser-qa.json>)

#### A07 — חלון מחיר אינו מבהיר את יחידת המכירה

**P2 · שימושיות מאומתת בקוד ובמסך · 0.5 יום אחרי אימות נתוני יחידה**

**מה נמצא:** החלון מציג ״מחיר חדש״ ושם מוצר, בלי שדה משקל/יחידה כאשר אלה אינם בשם. שאילתת האדמין אינה מביאה price_unit_note או תיאור. בקטלוג הציבורי קיימים מוצרים כמו לחם כוסמין 550 גרם.

**השפעה:** לא תמיד ברור למנהל אם הוא משנה מחיר לכיכר, אריזה, קילוגרם או יחידה אחרת.

**המלצה:** להציג יחידת מכירה מאושרת, מחיר קודם ותצוגת לפני/אחרי. לטפל יחד עם סנכרון המחיר היחסי S03, בלי להניח יחידה שאינה מתועדת.

**מועד:** עם S03; השלמת מידע בפגישה.

**מקור:** [admin-dashboard/src/services/productsRepository.ts:6](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/admin-dashboard/src/services/productsRepository.ts:6>) · [admin-dashboard/src/components/PriceDialog.tsx:64](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/admin-dashboard/src/components/PriceDialog.tsx:64>).

#### A08 — פוקוס בורח מחלון המחיר ואינו נראה במתגי ההגדרות

**P2 · נגישות ששוחזרה במקלדת · 0.5 יום**

**מה נמצא:** Tab יוצא מדיאלוג המחיר אל הרקע. יש פוקוס ראשוני ו־Escape, אך אין תחימה והחזרה. בהגדרות ה־checkbox מקבל outline כשהוא עצמו opacity:0, והמתג הגלוי אינו מציג חיווי מקביל.

**השפעה:** משתמש מקלדת אינו יודע מה נבחר או יכול להפעיל תוכן מאחורי חלון.

**המלצה:** להשלים את חוזה הדיאלוג ולהוסיף focus-visible על הרכיב הגלוי של המתג. להשתמש בהתנהגות משותפת לחלונות במקום תיקונים שונים בכל מסך.

**מועד:** בסבב הנגישות הראשון.

**מקור:** [admin-dashboard/src/components/PriceDialog.tsx:18](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/admin-dashboard/src/components/PriceDialog.tsx:18>) · [admin-dashboard/src/styles/index.css:240](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/admin-dashboard/src/styles/index.css:240>). [צילום מסך](<C:/Users/openb/.codex/visualizations/2026/09/12/01a09487-2a47-7122-882e-f285e50faaa2/bakery-audit-20260912/screenshots/admin-settings-keyboard-focus.png>) [נתוני בדיקה](<C:/Users/openb/.codex/visualizations/2026/09/12/01a09487-2a47-7122-882e-f285e50faaa2/bakery-audit-20260912/admin-browser-qa.json>)

#### A09 — מחיר עם פסיק עוקף את אזהרת השינוי הגדול

**P3 · באג ממוקד ששוחזר · פחות משעה**

**מה נמצא:** שינוי גדול עם נקודה הציג אזהרה; אותו פורמט עם פסיק לא הציג אותה. השמירה מנרמלת פסיק, אך unusualChange משתמש ב־Number(value) לפני הנרמול.

**השפעה:** אזהרה שמטרתה למנוע טעות הקלדה אינה עקבית בין שני פורמטים שהשדה תומך בהם.

**המלצה:** להשתמש באותו ערך מנורמל גם לחישוב האזהרה וגם לשמירה.

**מועד:** לפני הפגישה אם ממילא נוגעים בעורך המחיר.

**מקור:** [admin-dashboard/src/components/PriceDialog.tsx:32](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/admin-dashboard/src/components/PriceDialog.tsx:32>) · [admin-dashboard/src/components/PriceDialog.tsx:49](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/admin-dashboard/src/components/PriceDialog.tsx:49>). [צילום מסך](<C:/Users/openb/.codex/visualizations/2026/09/12/01a09487-2a47-7122-882e-f285e50faaa2/bakery-audit-20260912/screenshots/admin-price-comma-warning.png>)

#### A10 — במובייל שגיאת שמירת הגדרות נעלמת מהתצוגה

**P2 · משוב שגיאה; שוחזר בהדמיה · 1–3 שעות**

**מה נמצא:** לאחר כשל שמירה והיעלמות ה־toast, אין הודעת שגיאה נראית; נותר רק טקסט sr-only. הטיוטה נשארת לעריכה, אך אין הסבר חזותי מתמשך לכך שלא נשמרה.

**השפעה:** בעל מאפייה שהסיט רגע את המבט יכול לפספס את הכשל ולהניח שהעדכון פורסם.

**המלצה:** להציג הודעת שגיאה קבועה ליד אזור השמירה עד ניסיון מוצלח או שינוי רלוונטי, עם פעולה ברורה לנסות שוב.

**מועד:** לפני הפגישה או עם שאר תיקוני השמירה.

**מקור:** [admin-dashboard/src/pages/SettingsPage.tsx:19](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/admin-dashboard/src/pages/SettingsPage.tsx:19>) · [admin-dashboard/src/App.tsx:217](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/admin-dashboard/src/App.tsx:217>) · [admin-dashboard/src/styles/index.css:426](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/admin-dashboard/src/styles/index.css:426>). [צילום מסך](<C:/Users/openb/.codex/visualizations/2026/09/12/01a09487-2a47-7122-882e-f285e50faaa2/bakery-audit-20260912/screenshots/admin-mobile-error-after-toast.png>) [נתוני בדיקה](<C:/Users/openb/.codex/visualizations/2026/09/12/01a09487-2a47-7122-882e-f285e50faaa2/bakery-audit-20260912/admin-browser-extra.json>)

#### A11 — הפעולות המהירות במובייל מגיעות אחרי אזורי הסיכום

**P3 · העדפת סדר מידע מבוססת מדידה, לא באג · 2–4 שעות**

**מה נמצא:** ב־390×844 תחילת הפעולות המהירות נמצאת ב־y=1323.5, אחרי סטטוס, הודעה ומלאי. הן נגישות בגלילה ופועלות.

**השפעה:** אם הפעולה היומיומית העיקרית היא השהיית משלוחים או סגירה, בעל המאפייה צריך לגלול לפני שיגיע אליה.

**המלצה:** בפגישה לברר אילו שתי פעולות הבעלים מבצע הכי הרבה. לפי התשובה להעלות רק אותן סמוך לסטטוס במובייל, תוך שמירת מבנה הדסקטופ.

**מועד:** לאחר פידבק הלקוח.

**מקור:** [admin-dashboard/src/pages/OverviewPage.tsx:1](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/admin-dashboard/src/pages/OverviewPage.tsx:1>). [צילום מסך](<C:/Users/openb/.codex/visualizations/2026/09/12/01a09487-2a47-7122-882e-f285e50faaa2/bakery-audit-20260912/screenshots/admin-overview-mobile-quick-actions.png>) [נתוני בדיקה](<C:/Users/openb/.codex/visualizations/2026/09/12/01a09487-2a47-7122-882e-f285e50faaa2/bakery-audit-20260912/admin-browser-extra.json>)


### רוחבי

#### T01 — כתובת /shop/ מציגה בית, ולחנות מטא־דאטה של דף הבית

**P2 · ניתוב מאומת ו־SEO בסיסי · 0.5 יום**

**מה נמצא:** בדפדפן /shop מציג חנות ו־/shop/ מציג בית. גם בנתיב החנות canonical ו־og:url מצביעים על /. אין עדכון route-specific לכותרת. דף הבית עצמו כולל Bakery JSON-LD ופרטי עסק.

**השפעה:** קישור עם לוכסן סופי מוביל ליעד לא נכון. מנועי חיפוש ושיתוף אינם מקבלים זיהוי נפרד של החנות; לא נבדק אינדוקס בפועל.

**המלצה:** לנרמל pathname ולהגדיר התנהגות לנתיב לא מוכר. להגדיר title, description, canonical ו־OG ייעודיים לחנות, בלי החלפת framework.

**מועד:** לפני הפגישה אם יהיו קישורי חנות לשיתוף.

**מקור:** [src/App.tsx:1473](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/src/App.tsx:1473>) · [index.html:16](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/index.html:16>) · [index.html:26](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/index.html:26>).

#### T02 — ספירות קטלוג קשיחות מקשרות שינוי עתידי להשבתת כל המסך

**P2 · סיכון תחזוקה מותנה, לא כשל במצב הקיים · 0.5–1 יום**

**מה נמצא:** החנות דורשת בדיוק 10 קטגוריות, 78 מוצרים, 2 קבוצות ו־24 אפשרויות; האדמין דורש בדיוק 10/78. שינוי מבני תקין עלול להוביל למסך כשל. האדמין הנוכחי אינו מאפשר שינוי כזה.

**השפעה:** בעת הוספת מוצר עונתי או שינוי מבנה בעתיד, הבדיקה שנועדה להגן על baseline יכולה לעצור את ההזמנה או הניהול.

**המלצה:** במסגרת הרחבת קטלוג מאושרת, להחליף שוויון מספרי בחוזה גרסה ובבדיקת תקינות וקשרים. להשאיר בדיקת הספירות כבדיקת baseline ולא כתנאי runtime נצחי.

**מועד:** לפני הרחבת קטלוג; לא חייב לפני הפגישה.

**מקור:** [src/services/publicShopRepository.ts:100](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/src/services/publicShopRepository.ts:100>) · [admin-dashboard/src/services/dashboardRepository.ts:20](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/admin-dashboard/src/services/dashboardRepository.ts:20>).

#### T03 — מטא־דאטה פנימית מהקטלוג נמצאת ב־bundle הציבורי

**P2 · מזעור מידע ותחזוקה; מאומת בתוצר הבנייה · 2–4 שעות**

**מה נמצא:** ה־fallback מייבא את JSON המקור המלא. בתוצר נמצאים שדות כמו owner_needs_to_confirm, source_10bis_raw_lines ו־catalog_accuracy_notes. אלה נתוני עבודה, לא סיסמאות; אין לבלבל זאת עם A01.

**השפעה:** הפרדת source metadata בטבלאות הפרטיות אינה מספיקה אם אותו מידע מגיע כקובץ fallback ציבורי. החבילה מכילה גם תוכן שאינו נחוץ לקונה.

**המלצה:** לייצר fallback מצומצם ומפורש לשדות תצוגה בלבד, ולהשאיר הערות מקור ואישור מחוץ לחבילת הלקוח.

**מועד:** בסבב האמינות הראשון.

**מקור:** [src/services/publicShopRepository.ts:1](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/src/services/publicShopRepository.ts:1>) · [supabase/PUBLIC_CATALOG_CONTRACT.md:55](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/supabase/PUBLIC_CATALOG_CONTRACT.md:55>).

#### T04 — תיקיית המקור הישנה מתארת מערכת ללא אדמין ומסד

**P2 · פער תיעוד וגרסאות מאומת · 1–2 שעות**

**מה נמצא:** בתיקיית bakery-2-0-yachad-source תיעוד מ־10.7 אומר שאין backend/admin, אף שהקוד כולל אותם. release worktree מ־12.7 תואם למערכת החיה. תיקיית העבודה הנוכחית bakery-2-0-yachad-deploy מכילה פלט סטטי ישן ו־.git ריק.

**השפעה:** מפתח שמתחיל מהתיקייה הלא נכונה יכול לבדוק או לפרוס baseline ישן, או להציע לבנות יכולת שכבר קיימת.

**המלצה:** לאחד בעתיד את מקור האמת בתיעוד הראשי ולהוסיף מצביע ברור ל־release, לשני פרויקטי Vercel ולמגבלות MVP. בדוח הזה נשמרו שני המצבים בלי לתקן את קובצי המקור.

**מועד:** לפני כל סבב פיתוח הבא.

**מקור:** [PROJECT_CONTEXT.md:1](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/PROJECT_CONTEXT.md:1>) · [PROJECT_HANDOFF.md:1](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/PROJECT_HANDOFF.md:1>). [נתוני בדיקה](<C:/Users/openb/.codex/visualizations/2026/09/12/01a09487-2a47-7122-882e-f285e50faaa2/bakery-audit-20260912/checkpoint-20260912/source-git-status.txt>)

#### T05 — בדיקות הרגרסיה במאגר אינן מכסות את החנות והאדמין

**P2 · פער בדיקות מאומת בקוד · 1–2 ימים לכיסוי ליבה**

**מה נמצא:** tests/bakery.spec.ts מתמקד בדף הבית ובקולנועיות. קיימות בדיקות SQL, אך לא suite של זרימות החנות והאדמין. הביקורת הנוכחית יצרה תרחישי דפדפן מדומים שתפסו כשלים שה־build לא מזהה.

**השפעה:** שינוי שנראה קטן יכול לשבור איסוף, סכומים או אמינות שמירה בלי התרעה.

**המלצה:** להפוך את תרחישי 70/15/0, pickup-only, שינוי מחיר/זמינות, fallback, שמירה במקביל ושגיאות התחברות לבדיקות תחזוקה במאגר. להתחיל ממסלולים בעלי נזק מוכח.

**מועד:** יחד עם יישום התיקונים המאושרים.

**מקור:** [tests/bakery.spec.ts:35](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/tests/bakery.spec.ts:35>) · [playwright.config.ts:23](<C:/Users/openb/Documents/Bakery Release Worktrees/bakery-production-20260712-2310/playwright.config.ts:23>). [נתוני בדיקה](<C:/Users/openb/.codex/visualizations/2026/09/12/01a09487-2a47-7122-882e-f285e50faaa2/bakery-audit-20260912/shop-extra-results.json>)


## 5. סדר עדיפויות לפגישה ולשלבים שאחריה

| קבוצה | מה כדאי לכלול | מדוע |
| --- | --- | --- |
| תקלות מהותיות | A01; S01+A02; A03; A04; S03 | כניסה, יכולת להזמין, אמינות שמירה ודיוק מחיר |
| שיפורים בעלי ערך גבוה | S02/S04/S05/S06/S07; A05/A06/A08/A10; H01/H02/H03/H05; T01/T03/T05 | פחות תקיעות, אובדן עבודה וטעויות; גישה טובה יותר במובייל ובמקלדת |
| ליטוש והחלטות בעלים | A09/A11; H04/H06; S08/S09/S10; T02 | חלקם קלים, אך אינם מצדיקים דחיית הטיפול בתקלות הליבה |

**לפני הפגישה, אם תאשר יישום:** לטפל בחשיפת הסיסמה ובארבע קבוצות האמינות הראשונות, ואז לתקן הודעות מטעות/שדות חסרים ונגישות הכניסה להזמנה. אלה שינויים ממוקדים שאפשר לבצע תוך שמירת השפה שהלקוח מכיר. אין לבצע אותם אוטומטית מכוח דוח הביקורת.

**להשאיר לשיחה עם הבעלים:** בחירות טוסט ופיצה, יחידות/משקלים שלא תועדו, השלמת תיאור ותמונה לפי המוצרים הנמכרים, רשות/חובה בהערות, מיקום הפעולות היומיומיות במובייל וחיפוש בחנות. כדאי לבקש ממנו לבצע שלוש משימות: להשהות משלוחים ולהשאיר איסוף; לשנות מחיר ולסמן מוצר שאזל; להזמין מוצר במשקל עם תוספת. ההתבוננות בו תכריע מה דורש פישוט.

אין להבטיח ללקוח דוחות הזמנות, סטטוסים, תשלום, תזמון איסוף או עריכת תוכן — אלה אינם חלק מה־MVP הנוכחי. להוסיף רק אם יצא צורך ברור מהפגישה. חשבון משותף ויומן פעולות לפי אותו משתמש אינם מאפשרים לזהות איזה אח ביצע פעולה; חשבונות נפרדים הם החלטת הרשאה עתידית.

## 6. תוכנית שדרוג הדרגתית — להמלצה בלבד

**סביבת עבודה:** לאחר אישור, ליצור worktree חדש מתוך cc89bd5 בשם ברור, למשל `bakery-improvements-approved-20260912`, ועל branch חדש. זו דוגמת שם מומלצת בלבד; לא נוצר branch או worktree של שדרוג. אין להשתמש כבסיס בתיקיית הפלט הישנה או להכניס לתוכה את השינויים. עותק runtime שבדוח הוא עותק בדיקה בלבד של קוד קיים, ללא שדרוג.

**שלב א — גבול כניסה ואמינות תפעולית:** A01, ‏S01+A02, ‏A03, ‏A04. לבנות בדיקות מדומות במקביל, להציג לך diff ותצוגה מקומית, ולפרוס תיקון מאושר בנפרד. החלפת סיסמה/ביטול sessions/טיפול בפריסות ישנות ידרשו אישור מפורש לפעולות החיצוניות.

**שלב ב — חנות ונגישות:** S02–S07, ‏A05–A10, תפריטים, פוקוס וניגודיות. לשמור את תמחור 70/15/0 ואת המוצרים הקיימים. להראות משלוח/איסוף במובייל ובדסקטופ, הודעת כשל ושינוי מחיר חי מדומה.

**שלב ג — תוכן ותפעול שאושרו בפגישה:** אופציות מוצר, יחידות מכירה, תמונות, תיאורים, חיפוש וסדר פעולות. לכל החלטה לקבוע מקור מידע ואישור בעלים לפני היישום.

**שלב ד — תחזוקה וביצועים:** להרחיב בדיקות, לצמצם fallback, לעדכן תיעוד ולשפר עצירת RAF בלי שינוי המראה. אם תתוכנן הרחבת הקטלוג, להתאים אז את החוזה המספרי.

Preview חיצוני ייווצר רק אחרי בקשה/אישור, בשם וכתובת נפרדים וללא החלפת aliases קיימים. לכתיבות בדיקה יש להשתמש ב־mock או במסד בדיקות נפרד שאושר — עצם העובדה שה־frontend הוא preview לא הופכת את מסד הייצור למסד בדיקות. לא להעביר ל־preview סיסמת אדמין דרך VITE. גרסת הלקוח נשארת זמינה עד אישור ומיזוג/פריסה מפורשים.

תנאי השלמה לכל שלב: בדיקות התנהגות ממוקדות, build/lint/types, תמונות השוואה באותם רוחבים ומצבים, סקירת diff והחלטה שלך. לשינויים חזותיים משמעותיים נדרשת גם התרשמות אישית שלך; אין צורך לפתוח תהליך עיצוב מחדש בשביל התיקונים בדוח.

## 7. בדיקות טכניות, תנועה ומגבלות

| בדיקה | תוצאה | פירוט |
| --- | --- | --- |
| שימור המקור | PASS | 1,474 קבצים זהים ב־SHA-256 לפני/אחרי; release נשאר נקי |
| TypeScript — שתי האפליקציות | PASS | tsc על tsconfig.app.json ו־tsconfig.node.json, noEmit; קובצי build info בעותק הבדיקה |
| ESLint — שתי האפליקציות | PASS | eslint . --no-cache; לא נוספו תלויות |
| Vite build — שתי האפליקציות | PASS | build --configLoader native בעותק הבדיקה עם הגדרות דמה; Node v24.15.0 / Vite 8.1.4 |
| בדיקות SQL/RLS מקומיות | לא הורצו | Docker Linux engine אינו פועל; לא הופעלה תשתית ולא הורדה תמונת מסד |
| חנות רגילה | PASS במסלולים המפורטים | קטגוריות, סל, סכומים, כתובת מותנית, שני הרכבי סלט ואימות לפני סיכום |
| תרחישי תקלה | נמצאו FAIL ממוקדים | פירוט לפי מזהי הממצאים; לא תוקנו |
| אדמין | 32 בדיקות הושלמו | כולל 12 צירופי מסך/רוחב, כשלי שמירה, התחברות מדומה, הרשאות ממשק ותחרות בין שמירות |
| JavaScript בדפדפן | ללא חריגות לא מטופלות | הודעות HTTP 400/403/503 הופיעו בתרחישי כשל שהוזרקו בכוונה; אינן תקלות ייצור שהתגלו במקרה |
| נכסים | 70/70 תמונות הקטלוג הקיימות נטענו | 8 כתובות חסרות משתמשות ב־placeholder; לא נמדדה אמינות CDN לאורך זמן |

הבנייה הראשונה עם `configLoader runner` נכשלה ב־`require is not defined`; שימוש ב־loader native השלים את הבנייה ללא שינוי קוד. זו מגבלה של מסלול ההרצה המקומי שנבחר, ולא סיבה להציג את המוצר כשבור. גם כמה ניסיונות ראשונים בסקריפטי הבדיקה השתמשו בבורר control לא מתאים או המתינו מעט מדי למנגנון retry; תוקנו תסריטי הבדיקה בלבד, והמסלולים הורצו מחדש. הראיות הסופיות גוברות על ניסיונות אלה.

פקודות הליבה שבוצעו מתוך עותקי runtime:

```text
git --no-optional-locks status --porcelain=v1
git log -5 --oneline
git worktree list
git diff --check
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --tsBuildInfoFile ./audit-app.tsbuildinfo
node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --tsBuildInfoFile ./audit-node.tsbuildinfo
node node_modules/vite/bin/vite.js build --configLoader native
node node_modules/eslint/bin/eslint.js . --no-cache
node browser-baseline.cjs
node shop-flows.cjs
node shop-recheck.cjs
node shop-final-check.cjs
node shop-extra.cjs
node admin-browser-qa.cjs
node admin-browser-extra.cjs
```

פקודות Git נקראו במאגרים המקוריים; פקודות build/lint/types בעותק הבדיקה. לא בוצע npm install/npm ci ולא הותקנו ספריות. תלויות קיימות שימשו דרך junction מקומי. לא נטען שהורץ `npm run build` כלשונו: בדיקות TypeScript ו־Vite הורצו בנפרד כדי להשאיר את תוצרי הבדיקה בסביבה המבודדת.

### מה נמדד ומה נשאר חשד

נמדד בפועל: גלישה אופקית במצבים המפורטים, טעינת תמונות, תוצאות פעולות UI, רצף פוקוס, פעילות RAF בעמידה, היעדר בקשות פריימים ב־reduced motion, וגדלי תוצרי build. חבילת public ראשית כ־379KB ועוד shop כ־370KB; חבילת האדמין כ־505KB ומייצרת אזהרת גודל לא חוסמת. אלה גדלים לא דחוסים; אינם זמן טעינה.

מהקוד והנכסים: 150 פריימי desktop בכ־11.16MiB נכנסים לתור טעינה; mobile-lite מכיל 81 פריימים בכ־2.44MiB, והטעינה הפעילה מתחילה בפריים 8. כדאי למדוד טעינה קרה לפני שינוי אסטרטגיית מדיה. **לא נמדדו** LCP/INP/CLS מהשטח, FPS בטלפון פיזי, סוללה או רשת סלולרית. אין בסיס להכריז שהאתר ״איטי״ באופן גורף.

תשתית ההרשאות נבדקה בקוד ובמיגרציות: הפרדת public/admin, RLS, הרשאות עמודות, allowlist ופונקציות audit. בדיקת חשבון לא פעיל באדמין המדומה מאמתת את התנהגות הממשק, לא את אכיפת המסד בייצור. זה אינו מבדק אבטחה מלא.

## 8. הערכת איכות והחלטה

| שכבה | סטטוס | משמעות |
| --- | --- | --- |
| Technical QA | FAIL ממוקד במוצר הקיים | builds/types/lint עברו, אך קיימים כשלים מאומתים בחשיפת סיסמה, הזמנה ושמירה |
| Visual Acceptance | PARTIAL | שפה חזותית עקבית וראויה לשימור; ניגודיות ופוקוס דורשים תיקון |
| Reference / User Intent Fit | MATCH לשימור הכיוון הקיים | לא סופק רפרנס חיצוני חדש ולכן לא הוצהר על התאמה אליו |
| Independent Visual Critic | PARTIAL | סקירה נפרדת אישרה בסיס טוב ומצאה את הבעיות הממוקדות; אין המלצת redesign |
| User / Client Acceptance | PENDING לפידבק הלקוח | עצם העובדה שהלקוח ראה את האתר אינה אישור לכל פרט או לתפעול האדמין |
| Final Visual Status | PENDING | אין אישור חזותי חדש מטעם הבעלים |
| Final Decision — מוכנות להפעלה ללא הסתייגות | FAIL עד טיפול בתקלות הליבה | הביקורת עצמה הושלמה; לא נפתח סבב מימוש |

זו אינה דחייה של העיצוב הקיים ואינה הצעה להתחיל מחדש. מומלץ להציג בפגישה את הגרסה המוכרת, יחד עם הבחנה ברורה בין מה שכבר עובד לבין החלטות על ניהול וקנייה. חשיפת הסיסמה מצדיקה טיפול מאושר דחוף גם בזמן ההמתנה לפגישה.

## 9. ראיות ותוצרי הביקורת

- [ממצאים מובנים](findings.json) — 32 רשומות, כל אחת עם סיווג, עדיפות, מאמץ ומקור.
- [מצב ייצור והבדיקה הראשונית](browser-baseline.json) — HTML/JS references, ספירות ציבוריות וקיום password prefill. בדיקות local הראשונות בקובץ זה השתמשו ב־dist ללא config חי והן מתעדות fallback; מצב החנות התקין נבדק בנפרד ב־shop-healthy ובקובצי flow.
- [בדיקות חנות](shop-flow-results.json) · [בדיקות השלמה](shop-flow-recheck.json) · [איסוף ושינוי מחיר — תוצאות סופיות](shop-flow-final-check.json) · [כמויות, וריאנטים, פוקוס וכל התמונות](shop-extra-results.json).
- [סיכום 32 בדיקות אדמין](admin-qa-summary.json) · [תוצאות מפורטות](admin-browser-qa.json) · [תרחישי כשל נוספים](admin-browser-extra.json).
- [בדיקת שימור הקבצים](integrity-verification.json) · [הוראות שחזור](checkpoint-20260912/RESTORE.md) · [manifest של הגיבוי](checkpoint-20260912/manifest.json).
- תמונות מייצגות מופיעות ליד הממצאים. בתיקיית screenshots נשמרו צילומי דפדפן מהביקורת; תמונות אדמין ותרחישי קצה הן עם נתוני בדיקה, לא עם נתוני מנהל אמיתיים.

הכלים והמיומנויות שהופעלו: חלוקת בדיקה לשלושה סוקרים בקריאה בלבד באמצעות codex-subagent-orchestrator; בדיקת דפדפן דרך local-playwright-visual-qa ו־Playwright המקומי; visual-qa-director לביקורת העצמאית; hebrew-typography-director לעברית ו־RTL; motion-choreographer ו־immersive-web-engineer לבחינת canvas ותנועה; supabase לבחינת הקוד וההרשאות. נעשתה קריאה ממוקדת בזיכרון וב־Boss Second Brain לצורך שימור ה־baseline, ואימות עכשווי מול הקוד גבר על התיעוד הישן. לא הופעל workflow לעיצוב חדש ולא נשמר זיכרון חדש.

מקורות טכניים רשמיים: חשיפת משתני VITE מתועדת ב־[Vite: Env Variables](https://vite.dev/guide/env-and-mode). דפוס ההפרדה והרשאות המסד הושווה ל־[Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security). סף הניגודיות המקובל לטקסט רגיל הוא 4.5:1 לפי [W3C: Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html); הביקורת כוללת דגימות בלבד ואינה אישור עמידה כולל בתקן.

## 10. חמשת השיפורים שהייתי בוחר לבצע ראשונים

1. **A01 — להסיר חשיפת סיסמה ולטפל בפרטי הכניסה שנחשפו.** זהו גבול האמון של כל הניהול, וממצא חי שאינו תלוי בהעדפה עיצובית.
2. **S01 + A02 — להסדיר מצבי משלוח/איסוף בכל המערכת.** בעל המאפייה חייב להיות מסוגל להשהות משלוחים ולהמשיך לקבל איסוף, בלי לחסום לקוחות או להציג מצב סותר.
3. **A03 — למנוע דריסת הגדרות בין מנהלים.** הודעה חדשה אינה אמורה לבטל החלטה תפעולית שנעשתה בטלפון אחר.
4. **A04 — להבטיח שכל שמירת מוצר אכן נשמרת או נכשלת בגלוי.** פעולה שנעלמת בשקט מסוכנת יותר מחוסר בליטוש; היא פוגעת באמון היומיומי באדמין.
5. **S03 + A07 — לאחד מחיר ויחידת מכירה בין אדמין, כרטיס וסיכום.** לאחר שינוי מחיר, כל מה שהלקוח והמנהל רואים צריך להיות עקבי ומובן. נתוני משקל/יחידה חסרים יאושרו עם הבעלים, לא יומצאו.
