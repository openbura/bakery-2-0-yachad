import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react(), {
    name: 'bakery-route-documents',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const home = bundle['index.html'];
      if (!home || home.type !== 'asset' || typeof home.source !== 'string') return;
      const routes = [
        ['shop', process.env.VITE_BAKERY_ONLINE_ORDERS_ENABLED === 'true' ? 'הזמנה אונליין' : 'תפריט וסל לצפייה', process.env.VITE_BAKERY_ONLINE_ORDERS_ENABLED === 'true' ? 'תפריט מאפיית יחד והזמנה לאיסוף עצמי או משלוח בערי השירות.' : 'תפריט מאפיית יחד והרכבת סל לצפייה. הזמנות אונליין ייפתחו בקרוב.'],
        ['notifications', 'מעקב ועדכונים', 'פתיחת קישור המעקב והגדרת התראות להזמנה.'],
        ['terms', 'תקנון ותנאי שימוש', 'מידע על השימוש באתר והזמנות ממאפיית יחד.'],
        ['privacy', 'מדיניות פרטיות', 'מידע על פרטיות ופרטי הזמנה במאפיית יחד.'],
        ['shipping', 'משלוחים ואיסוף עצמי', 'מידע על משלוחים ואיסוף ממאפיית יחד בכפר סבא.'],
        ['cancellations', 'ביטולים והחזרים', 'מידע על שינוי וביטול הזמנות במאפיית יחד.'],
        ['accessibility', 'הצהרת נגישות', 'מידע על נגישות אתר וסניף מאפיית יחד.'],
      ];
      for (const [route, label, description] of routes) {
        const title = `${label} | מאפיית יחד`;
        const url = `https://bakery-2-0-yachad-deploy.vercel.app/${route}`;
        const values: Record<string, string> = { description, 'og:title': title, 'twitter:title': title, 'og:description': description, 'twitter:description': description, 'og:url': url };
        const source = home.source.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
          .replace(/(<meta\b[^>]*\b(?:name|property)="([^"]+)"[^>]*\bcontent=")[^"]*/g, (match, prefix: string, key: string) => values[key] ? prefix + values[key] : match)
          .replace(/(<link\s+rel="canonical"\s+href=")[^"]*/, `$1${url}`);
        this.emitFile({ type: 'asset', fileName: `${route}/index.html`, source: route==='notifications'?source.replace('</head>','<meta name="robots" content="noindex,nofollow"></head>').replace(/<link\s+rel="canonical"[^>]*>/,''):source });
      }
      this.emitFile({ type: 'asset', fileName: '404.html', source: home.source.replace(/<title>[^<]*<\/title>/, '<title>העמוד לא נמצא | מאפיית יחד</title>').replace('</head>', '<meta name="robots" content="noindex"></head>').replace('<div id="root"></div>', '<div id="root"><main dir="rtl"><h1>העמוד לא נמצא</h1><p><a href="/">לדף הבית</a> · <a href="/shop">לתפריט המאפייה</a></p></main></div>') });
      this.emitFile({ type: 'asset', fileName: 'order/index.html', source: home.source.replace(/<title>[^<]*<\/title>/, '<title>מצב ההזמנה | מאפיית יחד</title>').replace('</head>', '<meta name="robots" content="noindex,nofollow,noarchive"></head>').replace(/<link\s+rel="canonical"[^>]*>/, '') });
    },
  }],
})
