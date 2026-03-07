const ALLOWED_ORIGINS = [ 'https://chudzinovich.de', 'https://www.chudzinovich.de', 'http://localhost:8080', 'http://localhost:8888' ];
const VALIDATION = { email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, name: /^[\p{L}\s\-']{2,50}$/u, company: /^[\p{L}0-9\s\-&.,]{2,100}$/u };
const ipRequests = new Map();
const RATE_LIMIT = { maxRequests: 5, windowMs: 15 * 60 * 1000 };
let cachedToken = null;
let tokenExpiresAt = 0;
const sanitizeString = (str) => { if (typeof str !== 'string') return ''; return str.replace(/[<>"']/g, '').trim(); };

exports.handler = async (event) => {
  const requiredEnvVars = ['DROOMS_CLIENT_ID', 'DROOMS_CLIENT_SECRET', 'DROOMS_ROOM_ID', 'DROOMS_GROUP_LEVEL3'];
  const missingVars = requiredEnvVars.filter(env => !process.env[env]);
  if (missingVars.length > 0) {
    console.error('Missing ENV vars:', missingVars.join(', '));
    return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error.' }) };
  }

  const origin = event.headers.origin || event.headers.Origin || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  const corsHeaders = { 'Access-Control-Allow-Origin': allowedOrigin, 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  const clientIP = event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown';
  const now = Date.now();
  if (ipRequests.size > 1000) ipRequests.clear();
  const record = ipRequests.get(clientIP) || { count: 0, firstRequest: now };
  if (now - record.firstRequest > RATE_LIMIT.windowMs) { record.count = 1; record.firstRequest = now; } else { record.count += 1; }
  ipRequests.set(clientIP, record);
  if (record.count > RATE_LIMIT.maxRequests) {
    return { statusCode: 429, headers: { ...corsHeaders, 'Retry-After': Math.ceil((RATE_LIMIT.windowMs - (now - record.firstRequest)) / 1000) }, body: JSON.stringify({ error: 'Too many requests. Please try again later.' }) };
  }

  let payload;
  try { payload = JSON.parse(event.body); } catch { return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON' }) }; }
  if (payload._gotcha) return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) };

  const email = sanitizeString(payload.email).toLowerCase();
  const firstName = sanitizeString(payload.firstName);
  const lastName = sanitizeString(payload.lastName);
  const company = sanitizeString(payload.company);

  if (!email || !firstName || !lastName || !company) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing required fields' }) };
  if (!VALIDATION.email.test(email)) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid email format' }) };
  if (!VALIDATION.name.test(firstName) || !VALIDATION.name.test(lastName)) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid name format.' }) };

  const publicDomains = ['gmail.com','yahoo.com','outlook.com','hotmail.com','yandex.ru','mail.ru','icloud.com','protonmail.com','qq.com'];
  const domain = email.split('@')[1];
  if (publicDomains.includes(domain)) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Corporate email required. Public email providers are not allowed.' }) };

  if (!cachedToken || now > tokenExpiresAt) {
    try {
      const tokenRes = await fetch('https://identity.drooms.com/connect/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'client_credentials', client_id: process.env.DROOMS_CLIENT_ID, client_secret: process.env.DROOMS_CLIENT_SECRET, scope: 'drooms_api' })
      });
      if (!tokenRes.ok) throw new Error(`Token fetch failed: ${tokenRes.status}`);
      const data = await tokenRes.json();
      cachedToken = data.access_token;
      tokenExpiresAt = now + (data.expires_in - 60) * 1000; 
    } catch (err) {
      console.error('Drooms token error:', err);
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Internal Server Error. Could not authenticate with VDR.' }) };
    }
  }

  try {
    const droomsPayload = {
      email, firstName, lastName, companyName: company, groupIds: [process.env.DROOMS_GROUP_LEVEL3],
      permissions: { canDownload: false, canPrint: false, watermarkEnabled: true, watermarkText: `${email} | ${clientIP} | ${new Date().toISOString()}` },
      notificationSettings: { sendInvitationEmail: true, language: 'en' }
    };
    const droomsRes = await fetch(`https://api.drooms.com/v3/data-rooms/${process.env.DROOMS_ROOM_ID}/external-users`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${cachedToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(droomsPayload)
    });
    if (!droomsRes.ok) {
      const errorText = await droomsRes.text();
      console.error('Drooms API error:', droomsRes.status, errorText);
      return { statusCode: 502, headers: corsHeaders, body: JSON.stringify({ error: 'VDR service temporarily unavailable.' }) };
    }
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true, message: 'VDR access granted. Check your email for invitation.' }) };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Internal Server Error. Please try again later.' }) };
  }
};