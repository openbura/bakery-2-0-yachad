# מגש אירוח, משלוחים וביקורת תמונות — 26.10.2026

## הושלם מקומית

223 מוצרים. נוסף מגש אירוח 12 כריכונים ב־144 ₪, מחולק למיקס או שלם. במיקס בוחרים כמות מכל אחד מחמשת המילויים וחייבים להגיע ל־12 בדיוק. בשלֵם בוחרים מילוי אחד בלבד ומוצגת הבהרה שכל 12 הכריכונים יהיו ממנו. החלפת מצב מנקה בחירות קודמות, ופיוס סל דוחה חלוקה ישנה/שגויה. מילויים: סלט טונה, סלט ביצים, פסטו בולגרית, סביח וחביתה.

נוצרה תמונת המחשה חדשה: 12 לחמניות מיני מאורכות, שלוש שורות של ארבע, וחביתה צהובה מזוהה. תמונה זו בלבד נוספה לקטלוג, עם כיתוב המחשה מחוץ לצילום. קובץ: public/catalog-owner-20261026/catering-12-mini-rolls-v4.png. נעשה שימוש בכלי image_gen המובנה, ולא ב־CLI/API. הפרומפט הסופי ומקור הפלט מתועדים ב־catering-delivery/image-generation-record.json.

דמי המשלוח בתצוגה ובחישוב המקומי: כפר סבא 20 ₪; הוד השרון, רעננה ויישובי הסביבה 30 ₪; איסוף עצמי 0 ₪. נוספה בחירת אזור כבר בסל/קטלוג כדי שהמחיר ברור לפני פרטי ההזמנה, ושדה חופשי לשם יישוב בסביבה. האזור והטקסט נשמרים ברענון. זמינות משלוח ליישוב תאושר מול המאפייה; מחיר האזור נשאר 30 ₪. מינימום המשלוח נשאר 70 ₪.

האקסל סונכרן ל־223 שורות. נוספו המגש, מחירו, כל חמשת המילויים וכללי מיקס/שלם. אין משקל או רשימת אלרגנים שהומצאו עבור המגש.

## ביקורת חזותית מחמירה — טרם הוחלה על כל הקטלוג

בצילום המצב הקודם: 222 מוצרים, 212 קובצי תמונה ייחודיים. ב־74 קבצים צבעי הפינות אינם כמעט־לבן. 51 קבצים מרובעים/אנכיים ו־161 אופקיים; שולי קנבס וגודל מזון שונים, ושלושה נתיבי CSS שונים מחריפים את חוסר האחידות. התמונות לא הוחלפו אוטומטית בעקבות הביקורת.

ניסוי בידוד רקע גנרטיבי בשלושה מוצרים נפסל: המודל שינה צבעים ופרטי אריזה. אף אחד מפלטי הניסוי לא הוכנס לחנות. במקום זאת הוכנה דוגמת UI נפרדת על שישה מוצרים, עם צילומי המקור ללא שינוי, חיתוך תצוגה ומסכות SVG, מסגרת לבנה ונרמול לפי גבולות המוצר. יש כפתורי ״לפני״ ו״דוגמה לאישור״. מדובר בדוגמת שיטה, לא מסכות ייצור מאושרות. נדרשת בדיקת קצוות לכל מוצר לפני הרחבה. אפור שנראה דרך פלסטיק שקוף הוא חלק מצילום האריזה ואין להלבינו באמצעות שינוי תוויות או מוצר.

Owner/implementation: root. Primary workflow: local-playwright-visual-qa with bounded visual-site-fix. Reference: baseline original photos plus owner's explicit white-background requirement. Success criteria: unchanged food/labels; white outside-product background; common aligned viewport without distorted proportions; visible whole product; mobile/desktop review and explicit owner acceptance before catalogue-wide rollout.

Independent review: the initial masks failed gray-halo checks. After revisions, the six-product proposal matches white card backgrounds, broad-halo removal, responsive layout and source fidelity. Edge precision remains a per-photo review gate; a small bread-shadow artifact was removed in the final revision. User acceptance remains PENDING. No catalogue-wide change is claimed.

## בדיקות וגבולות

25 בדיקות domain עברו. Build ו־lint עברו לציבורי ולאדמין. בדיקת דפדפן ב־390/430/768/1440/1920: מיקס 12 בלבד, חסימת 11/13, מצב שלם ומילוי יחיד, מחיר 144 ₪, מחיר כולל 164/174 ₪, שדה יישוב חופשי, בחירות וסל אחרי רענון, RTL וללא overflow. לא נרשמו page/console errors או HTTP failures. דוגמת התמונות נבדקה ב־390 וב־1440 עם מקור וגרסה מוצעת. לא נבדקו מכשיר פיזי או הזמנה אמיתית.

האקסל נפתח מחדש והמחירים/מספר השורות/RTL אומתו גם ב־XML/ZIP. המקור נשמר, כולל סגנונות. לכלי התצוגה אותו exit 1 לאחר יצירת התצוגות והשלמת האימות, ולכן האימות העצמאי משמש לצד בדיקה חזותית. לא נפתח Excel שולחני. npm audit: שני High קיימים בכל אפליקציה, Vite ו־zod; לא שונו תלויות.

לא בוצעו commit/push/deploy או שינוי במסד החי. ההזמנות והתשלום נשארו כבויים. לפני פתיחת הזמנות צריך לסנכרן גם את חוזה ה־RPC: כיום השרת משתמש בדמי משלוח גלובליים ואינו מקבל option_ids כפולים. מגש המיקס ורטב כפול דורשים תמיכת כמות/slots וחוקי הרכבה בשרת; בדיקת סל מקומית אינה הוכחת RPC.

## קבצים וסקירה

src/shop/cateringTray.ts; src/shop/deliveryPolicy.ts; src/shop/cartReconciliation.ts; src/ShopPage.tsx; src/styles.css; src/services/publicShopRepository.ts; domain-tests/operational.test.mjs; product-catalog-yachad.json; admin-dashboard/src/data/catalogSeed.json; src/data/public-catalog-fallback.json; src/data/product-image-disclosures.json; public/catalog-owner-20261026/catering-12-mini-rolls-v4.png. גיבוי וקובצי QA: outputs/wolt-kfar-saba-20261026/catering-delivery.

חנות: http://127.0.0.1:4326/shop
דוגמת תמונות: http://127.0.0.1:4326/photo-review.html
