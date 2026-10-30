# פרסום מאפיית יחד — 30.10.2026

בוס אישר במפורש פרסום ודחיפה ל־Git של תיקוני האדמין, מסמכי המידע, נגישות המחירים וחמשת מחירי הפחיות מ־12 ל־10 ₪. הכריכים32 ₪, הסלט45 ₪, עוגות יחד75 ₪ ומגש12ב־144 ₪ נשמרים.

מקור: project/ בענף fix/yachad-live-sync-20261028. דחיפה לענף זה בלבד, ללא מיזוג ל־main. פרטי התיקונים והבדיקות: project/FINAL_FIXES_20261030_HE.md.

נקודות שחזור הפריסה לפני העדכון:
- חנות: dpl_2QmKZWu2GtJG9oV11B48To9XJfdh
- אדמין: dpl_HUcDn6FwvHfL1d1rDMuSM2Mjx6cm
- חמש הפחיות: drink-prices-before.json. העדכון המוגן: drink-prices-update.sql.

הבדיקות המקומיות עברו לפני האישור: build/lint לשתי האפליקציות,26בדיקות domain, חמשת רוחבי המסך, תצוגת מחירים וסל, ארבעה תרחישי SQL וגיבוי. לא חוברה סליקה ולא השתנו הרשאות מסד.

הפרסום הושלם ונבדק בחי. חנות dpl_Gcsud8oWZA7USgTNanAvsN7JoJXd; אדמין dpl_8q4ogssgW5bhS6W75WkEXQx5XvKn. דוח: project/RELEASE_20261030_HE.md. מחירי אחרי ושחזור מוגדר ב־drink-prices-after.json וב־drink-prices-rollback.sql; המניפסטים ובדיקות האימות מצורפים.
