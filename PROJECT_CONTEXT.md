# Project Context — Bakery / Yachad Bakery

עודכן: 2026-07-12

## מצב מאומת

- אתר ציבורי ו־`/shop` מחוברים ל־Supabase ול־Realtime.
- דשבורד נפרד מחובר ל־Supabase Auth ולנתוני המסד.
- מסד ייעודי: `yachad-bakery-admin`, ref `utyzqpjjjwjkkdlepkag`, אזור `eu-central-1`.
- קטלוג: 78 מוצרים, 10 קטגוריות, 2 קבוצות בחירה ו־24 אפשרויות פעילות.
- כל 78 המוצרים זמינים במצב הבסיס המאושר.
- הגדרות בסיס: ordering/delivery/pickup פעילים, הודעה כבויה מסוג `info`, עמלות 1500/7000/0 אגורות.

## ייצור

- Homepage: https://bakery-2-0-yachad-deploy.vercel.app/
- Shop: https://bakery-2-0-yachad-deploy.vercel.app/shop
- Admin: https://yachad-bakery-admin.vercel.app/

## חוזים חשובים

- Public משתמש ב־publishable key בלבד ובגישה אנונימית לקריאה בטוחה.
- Admin מורשה לעדכן רק `price_agorot`, `available_today` ושדות תפעוליים מאושרים ב־`store_settings`.
- `audit_log` append-only ונכתב מטריגרים של המסד.
- Realtime כולל רק `products` ו־`store_settings`.
- `product_source_metadata`, `admin_users` ו־`audit_log` אינם פתוחים לציבור.
- החנות שומרת כסף באגורות, מפייסת cart מול snapshot חי ומאמתת שוב לפני WhatsApp.

## מגבלות MVP

- אין שמירה, reservation או סטטוס להזמנות בשרת; WhatsApp הוא יעד ההזמנה.
- אין תשלום אונליין או דומיין מותאם.
- חשבון האדמין משותף ולכן audit מזהה את החשבון, לא את האח הספציפי.
