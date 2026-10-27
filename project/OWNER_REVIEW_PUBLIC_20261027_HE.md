# גרסה ציבורית לסקירת בעל המאפייה — 27.10.2026

באישור בוס פורסמה החנות המעודכנת לצורך מעבר על המוצרים, התמונות, המחירים והבחירות. [החנות הציבורית](https://bakery-2-0-yachad-deploy.vercel.app/shop).

- 222 מוצרים ו־210 תמונות סטודיו ייחודיות, כולם זמינים לבחירה בסל.
- פס ״סביבת בדיקה מקומית״ אינו נכלל בפרסום והוסר גם מהשרת המקומי.
- אפשר לבחור מוצרים, אפשרויות וכמויות ולבדוק סכומים ומשלוח 20/30₪. הגרסה אינה שולחת הזמנות ואינה אוספת פרטי לקוח. אין סליקה.
- הקטלוג המפורסם מקובץ באתר באמצעות `VITE_BAKERY_OWNER_REVIEW=true`; אין fetch או Realtime למסד הישן, ולכן 222 המוצרים אינם מוחלפים ב־78 הישנים.
- `onlineOrdersEnabled` נשאר false במצב סקירה גם אם דגל הזמנות אחר true. הזרימה המקומית המלאה נשמרה בנפרד לבדיקת checkout עם SQL.

## בדיקות

Public/Admin build ו־lint עברו, ובדיקות domain25/25 עברו. npm audit עדיין מדווח על 2High קיימים ב־Vite/Zod בכל אפליקציה; לא השתנו תלויות או lockfiles.

בדיקת השחרור המקומית 390/430/768/1440/1920: כל 222 התמונות נטענו בכל רוחב, מסגרות אחידות, סל/רענון/בחירת אזור ובחירות מגש 12 ופיצה משפחתית עברו. ללא שגיאות דפדפן, HTTP, גלישה אופקית, בקשות Supabase או POST. עמוד הבית וחמשת העמודים המשפטיים נטענו. סקירה אישית וביקורת עצמאית על צילומים אמיתיים: MATCH, ללא חסמים חזותיים. הקטלוג/הנראות אושרו בידי בוס; התוכן העסקי ממתין למעבר בעל המאפייה.

לאחר הפרסום נבדק הקישור הציבורי בדפדפן אנונימי בחמשת הרוחבים. כל 222 התמונות נטענו ב־390; בשאר הרוחבים נבדקו תמונות מדגם, כל 222 הכרטיסים, הסל והפריסה. רענון, מגש ופיצה, עמוד הבית והנתיבים המשפטיים עברו. אפס שגיאות, אפס בקשות Supabase ואפס POST. אין צורך בהתחברות Vercel בקישור שנמסר.

## פריסה ושחזור

- פרויקט: `prj_BvNGcjulLdvWiHigIt4xTTttXvRw` / `bakery-2-0-yachad-deploy`, צוות `team_EAXZWTqW3Ws4dGfK9ALVQcCi`.
- Deployment: `dpl_AiarTkN2SssuxdtL1H1APb9W9s1r`, מצב READY, production. נוצר כ־prebuilt וקודם לדומיין הקיים.
- כתובת גרסה: https://bakery-2-0-yachad-deploy-p8l5ws9qz-openbura-5527s-projects.vercel.app
- שחזור מאושר טכנית לגרסה הקודמת: `dpl_7VkBvCqgspndooCUvRSiWYKr1QbQ`. אין לבצע rollback ללא סיבה תפעולית/בקשת בוס.
- CLI קיים 50.28.0 שימש להעלאת תיקיית build מקומית, כי המחבר אינו מקבל תיקייה מקומית לפריסה. לא הותקנה תלות חדשה.
- 636 קבצי אתר,87,854,943 בתים; תמונות המקור הישנות שלא נמצאות בשימוש לא נכללו. דוח SHA256 ב־release-manifest.json.
- אין commit או push. בסיס working tree הוא `85a1714c510ba05b6cd0875c5dd89984d03a3605`; הפריסה כוללת שינויים מקומיים שאינם ב־commit זה. אין לייחס לו את מלוא תוכן השחרור.
- אין פריסת Admin, שינוי DB/seed/migration, שינוי הרשאות/דומיין, או הפעלת תשלום/Push.

קבצי היישום בסבב: `src/shop/release.ts`, `src/shop/publicShopTypes.ts`, `src/services/publicShopRepository.ts`, `src/hooks/usePublicShop.ts`, `src/ShopPage.tsx`; פס מקומי הוסר מ־`../review/online-server.cjs`. כל שאר שינויי המשתמש נשמרו.

ראיות: `C:/Users/openb/Documents/bakery-2-0-yachad-deploy/outputs/public-owner-review-20261027/` — גיבויים, release-manifest, לוגי build/lint/audit/deploy/promote, local/qa.json, remote/qa.json וצילומי מסך. מידע על כיוון הפריסה נמצא ב־`release/.vercel/output/config.json`.

פרסום חוזר מחייב בנייה מכוונת עם מצב owner review או השלמת backend באישור נפרד. אין לפרוס בטעות build בדיקה עם מפתח דמה או build רגיל שמחזיר את קטלוג 78 מהמסד הישן.
