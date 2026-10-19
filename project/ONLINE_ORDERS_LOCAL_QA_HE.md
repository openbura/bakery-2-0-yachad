# הזמנות אונליין — מימוש ובדיקה מקומיים, 19.10.2026

> המשך באותו יום: נוסף [מימוש Push ללקוח ולבעלים](./PUSH_LOCAL_QA_HE.md). הקוד והתורים מחוברים מקומית; אין עדיין הוכחת מסירה דרך ספק או למסך נעול. הפסקאות ״Push טרם מומש״ להלן מתעדות את השלב הקודם ומוחלפות בדוח החדש. אין שינוי בחי או סליקה.

המקור הפעיל הוא `yachad-shop-repairs-20261019/project`, בענף `codex/yachad-shop-repairs-20261019`, בסיס `22f7786`. המשכנו מהמימוש ההיסטורי של ההזמנות ושמרנו את תיקוני החנות שכבר בוצעו. אין commit, push, פריסה, סליקה או שינוי ב־Supabase החי.

## לפתיחה ולבדיקה

- חנות: http://127.0.0.1:4320/shop
- מערכת הבעלים: http://127.0.0.1:4321/orders
- כניסה **מקומית לדוגמה בלבד**: שם משתמש `owner`, סיסמה `local-review-only`. אלו אינם פרטי הכניסה של העסק. הסיסמה אינה ממולאת אוטומטית.
- בוחרים מוצר, ממלאים פרטים ולוחצים ״שליחת הזמנה לאישור״. ההזמנה נשמרת במסד המקומי ומתקבל עמוד מעקב פרטי.
- במערכת הבעלים לוחצים ״תחילת משמרת והפעלת צליל״. ״ראיתי״ משתיק את ההתראה לאותה הזמנה בלבד; ״אישור הזמנה״ הוא פעולה נפרדת שמעדכנת את הלקוח.

## הזרימה שנבנתה

1. הטופס בודק מחירים, זמינות, בחירות, מינימום, טלפון וכתובת. באיסוף בוחרים מועד פנוי לפחות שעה קדימה; אין הבטחת זמן הגעה למשלוח.
2. לפני השליחה נשמרים בלשונית בקשה מדויקת ומזהה ייחודי. רענון, ביטול ההמתנה או אובדן תגובה שומרים אפשרות לבדוק ולשלוח מחדש את אותה בקשה, בלי להמציא מזהה חדש.
3. השרת מחשב מחדש את המחיר ובודק שהסכום זהה לזה שהלקוח אישר, בתוך אותה טרנזקציה. שמירת ההזמנה, השורות, התוספות וההיסטוריה אטומית.
4. הלקוח רואה מספר הזמנה, ״ממתינים לאישור המאפייה״, סיכום מוצרים וסכום, אופן קבלה וקישור שניתן להעתיק. אין סימון הצלחה ירוק לפני אישור העסק.
5. אישור, הכנה, מוכנה לאיסוף / יצאה למשלוח, הושלמה, דחייה וביטול מתעדכנים במסך הלקוח. דחייה וביטול מחייבים סיבה. אין ETA, ספירה לאחור או `promisedBy` בתשובת המעקב.
6. התשלום נשאר `not_configured`. אישור העסק ו״ראיתי״ אינם מבצעים חיוב.

## התראות הבעלים והלקוח

התראת הבעלים מופיעה בכל מסכי האדמין. תור הבקשות הממתינות שלא נצפו נקרא מהשרת בעימוד, ללא חיתוך ל־100 האחרונות. הצליל המקומי חוזר כל שש שניות עד ״ראיתי״ שנשמר בהצלחה. כשל שמירה משאיר את ההתראה. אישור או דחייה הם טיפול בבקשה ומסירים אותה מתור הממתינות. רשימת הפעילות עצמה כוללת גם הזמנות שאושרו ובהכנה; הארכיון מוגבל בנפרד ל־100 סגורות אחרונות.

טבלת `order_attention` נפרדת שומרת מי ראה ומתי, בלי לשנות `orders.updated_at` או לפגוע בהגנת שינויי סטטוס מקבילים. יש בדיקות מחזוריות כגיבוי ל־Realtime. כשל קטלוג או מועדי איסוף אינו חוסם את מסך ההזמנות. בחזרה למסך נבדקת בקשת שמירת מסך דולק כאשר המכשיר תומך בכך.

הלקוח יכול לבחור צליל לעדכוני מצב **כשהדף פתוח**. אין כרגע SMS, שליחת WhatsApp אוטומטית או Push ברקע. הכפתור באדמין לעדכון WhatsApp הוא ידני ומסומן כך; הזמנה חדשה אינה נשלחת ל־WhatsApp.

אפשר להוסיף בעתיד Web Push ללא עמלת SMS/WhatsApp לכל הודעה, בכפוף למכסות התשתית. באייפון/iPad נדרשים iOS/iPadOS 16.4 ומעלה, הוספה למסך הבית והרשאה בעקבות לחיצה. אין צורך במנוי Apple Developer, אבל נדרשים service worker ושרת שולח. זה **טרם מומש**, ו־Focus/הגדרות המכשיר עדיין חלים. [תיעוד Apple/WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).

למאפייה מתאים מכשיר קיים ייעודי, מחובר לחשמל, כשהמסך פתוח. יש לבצע בדיקת שמיעה במקום בזמן מוזיקה ועומס. האתר אינו יכול להנמיך מוזיקה שמגיעה ממכשיר אחר. אין הבטחת צליל ברקע או במסך נעול; לאחר רענון נדרשת הפעלת שמע מחדש. בדיקת Chrome מושתק אינה בדיקת עוצמה או Safari פיזי.

## מסד הבדיקה והבידוד

באישור המשתמש הורד `@electric-sql/pglite@0.5.10` בלבד לתיקיית `review/local-db`, בלי להוסיף תלות לאתר. מופעל PostgreSQL 18.6 בתוך המחשב, כולל PL/pgSQL ו־pgcrypto. המיגרציות האמיתיות, RLS, פונקציות ההזמנה ושמירה לקבצים נבדקים בו.

שרת `review/online-server.cjs` מקשיב ל־loopback בלבד, בפורטים 4320 ו־4321. בזמן הבנייה הוגדרו משתני תהליך עם מפתח דמה; לא הועתק סוד. השרת מפנה קריאות לאותו hostname מאושר לשער המקומי, ו־CSP חוסם חיבור API לענן. בדיקות הדפדפן חוסמות בנוסף כל ניסיון להתחבר ל־Supabase החי. תמונות וגופנים חיצוניים עשויים להיטען בקריאה בלבד.

לכל גרסת bootstrap, מיגרציות, seed וצילום קטלוג מחושב SHA-256. שם תיקיית הנתונים מכיל את החתימה, והפתיחה בודקת manifest שנכתב רק אחרי השלמת האתחול. כך אין הרצה שקטה של פונקציות ישנות במסד שמור. החתימה בבדיקות נשמרת ב־`review/sql-manifest.json` וניתנת לבדיקה גם ב־`/__local/state`.

צילום הקטלוג מכיל 78 מוצרים, 10 קטגוריות, 5 קבוצות ו־48 אפשרויות; מוצר אחד אזל. תרחישי הבדיקה משנים נתונים מקומיים בלבד. לצורך בדיקה בכל שעה פתחנו **מקומית בלבד** את שעות המשלוח; בדיקת SQL נפרדת מאמתת דחייה כשהמשלוחים סגורים.

**גבולות ההוכחה:** PGlite משתמש בחיבור יחיד מסודר בתור. אין כאן הוכחת תחרות בין חיבורי PostgreSQL 17 אמיתיים. Auth/JWT transport ו־WebSocket מקומיים מדומים; הרשאות SQL וה־UID נבדקים בפועל. Supabase Auth אמיתי, PostgREST, Realtime, Safari/APNs ומכשיר פיזי עדיין אינם מאומתים. לפני הפעלה מרוחקת יש לבצע בדיקה בסביבת Supabase מבודדת, באישור נפרד. לא מוחלים את ה־seed או צילום הבדיקה על העסק החי.

## פקודות וראיות

מתוך `project`:

```powershell
$env:VITE_BAKERY_SUPABASE_URL='https://utyzqpjjjwjkkdlepkag.supabase.co'
$env:VITE_BAKERY_SUPABASE_PUBLISHABLE_KEY='sb_publishable_local_review_only_not_a_real_key'
npm run build
$env:VITE_BAKERY_ADMIN_SUPABASE_URL='https://utyzqpjjjwjkkdlepkag.supabase.co'
$env:VITE_BAKERY_ADMIN_SUPABASE_PUBLISHABLE_KEY='sb_publishable_local_review_only_not_a_real_key'
$env:VITE_BAKERY_SHARED_LOGIN_EMAIL='owner@local.bakery.invalid'
$env:VITE_BAKERY_SHARED_LOGIN_USERNAME='owner'
npm --prefix admin-dashboard run build
node ../review/online-server.cjs
```

בחלון נוסף: `npm run qa:review`, `npm run qa:sql`, `npm run test:domain`, `npm run lint`, `npm --prefix admin-dashboard run lint`, `node supabase/scripts/generate-seed.mjs --check`, `node ../review/verify-normal-build.cjs` ו־`git diff --check`.

`qa:review` מאפס ומשנה את מסד **הבדיקה בלבד**. יש לשמור את תיקיית האח `review` יחד עם `project`. אין לפרוס build שנבנה עם מפתח הדמה. לבדיקת SQL נדרשת ההתקנה המבודדת שכבר אושרה; אין הורדה אוטומטית בפקודות הבדיקה.

- `review/sql-results.json`: 24 תרחישי SQL, כולל הרשאות פונקציות, NULL, מחיר שהשתנה, כפילויות, CAS, סיבות דחייה, פרטיות, קיבולת מועדים, פיצה/סלט, תור 205 הזמנות והתמדה אחרי סגירה ופתיחה.
- `domain-tests/operational.test.mjs`: 17 בדיקות תמחור, טלפון, טיוטה, אחסון חסום/פגום/גדול, זהות שליחה ותשובה מאוחרת.
- `review/online-qa/results.json`: תוצאות הדפדפן העדכניות. נבדקים משלוח ב־390/430/768/1440/1920, איסוף, דחייה, אובדן תגובה, timeout לאחר commit, תגובה מאוחרת אחרי עריכה, ACK שנכשל, תור על פני ניווט ורענון, שגיאת מעקב, צליל חוזר, כשל חלקי, אחסון חסום ומרוץ מחירים.
- `review/online-qa/*.png`: ממתין, אושר, כרטיס בעלים מלא, איסוף, דחייה ושחזור.

## קבצי המימוש העיקריים

- לקוח: `src/ShopPage.tsx`, `src/OrderTrackingPage.tsx`, `src/services/ordersRepository.ts`, `src/shop/orderSubmission.ts`, `src/shop/orderTypes.ts`, `src/shop/checkoutSession.ts`, `src/App.tsx`, `src/styles.css`, `src/LegalPage.tsx`.
- בעלים: `admin-dashboard/src/pages/OrdersPage.tsx`, `components/OwnerOrderAlerts.tsx`, `components/OrderAttentionProvider.tsx`, `hooks/useOrderAttention.ts`, `services/ordersRepository.ts`, `services/orderAttentionRepository.ts`, `domain/orderSound.ts`, `App.tsx`, `layout/AdminShell.tsx`, `styles/index.css`, `types/database.ts`, `types/dashboard.ts`, `config/bakeryEnvironment.ts`, `services/authService.ts`, `pages/LoginPage.tsx` — כולם תחת `admin-dashboard/src`.
- SQL: `supabase/migrations/20260920190000_add_order_management.sql`, `20261019193000_add_order_attention.sql`; seed והבדיקות הנלוות בתיקיית `supabase`.
- נתיבים/פרטיות: `vite.config.ts`, `vercel.json`, `index.html`. נתיב המעקב מסומן noindex/no-store/no-referrer; כתובת לא קיימת נשארת 404.
- תשתית מקומית: `review/online-server.cjs`, `review/local-db/database.cjs`, `verify-orders.cjs`, `review/qa-online.cjs`, `review/verify-normal-build.cjs`, `package.json`.
- תיעוד: `ACTIVE_VERSION.md`, `PROJECT_CONTEXT.md`, `ONLINE_ORDERS_AND_ALERTS_HE.md`, `REPAIR_REPORT_HE.md`, `LEGAL_RELEASE_GATE.md`, `README.md`, `DEPLOYMENT.md`, `PLANS.md`, `PROJECT_HANDOFF.md` והדוח הזה.

## קבלה והשקה

Technical QA: **PASS בהיקף המקומי** — 16 תרחישי דפדפן, 24 בדיקות SQL ו־17 בדיקות domain. Build ו־lint עברו לשתי האפליקציות; בדיקת seed והבנייה הרגילה עברו. npm audit של שתי האפליקציות: אפס התראות בזמן הבדיקה. באדמין קיימת אזהרת bundle מעל 500KB שאינה כשל בנייה. בדיקת pgTAP/Docker על PostgreSQL 17 לא הורצה; היא אינה כלולה ב־PASS המקומי.

הרצת הדפדפן המלאה הראשונה הסתיימה ב־15/16 עקב מרוץ בנהג הבדיקה בין prompt לאישור דחייה. הנהג תוקן להמתין לתשובת שינוי הסטטוס, והתרחיש שנכשל הורץ שוב ועבר. התוצאה המקורית וההרצה החוזרת נשמרו; `review/verification-summary.json` מתעד את הסיכום ואת חתימת המסד. אין כשל בדיקה פתוח שהוסתר.

Visual Acceptance: **MATCH בהיקף שנבדק**, כולל ביקורת read-only נפרדת של צילומים בפועל ב־390/430/768/1440/1920. מסך ממתין מובחן מאישור; RTL, כרטיס ההזמנה וכפתורי אישור/דחייה נבדקו. Reference/User Intent: **MATCH** לזרימת האישור המבוקשת ללא זמן נותר ועל בסיס המימוש הקיים; לא סופקה תמונת ייחוס להעתקה. User Acceptance: **PENDING** עד סקירה של בוס. Final Decision: המימוש המקומי מוכן לסקירה; **אינו אישור להשקה** או אישור חזותי אישי סופי.

דף הבית, המדיה והאנימציות נשמרו. לא חוברו Grow, Push או שירות בתשלום; לא בוצע שינוי בקטלוג/מלאי חי. לפני השקה נשארים בדיקת מכשיר במאפייה, בדיקת התשתית האמיתית, סליקה ואישורי השירות/מידע מזון שב־`LEGAL_RELEASE_GATE.md`. טקסטי המדיניות הותאמו לזרימה אך נשארים טיוטה לבדיקת העסק והגורם המקצועי.
