const fetch = require('node-fetch');

const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

module.exports = async (req, res) => {
  const { code, state } = req.query;

  console.log('Callback invoked');
  console.log('Received code:', code);
  console.log('Received state:', state);

  // استخراج الـ state من الـ cookies
  const cookieHeader = req.headers.cookie || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => c.trim().split('='))
  );
  const storedState = cookies.oauth_state;
  console.log('Stored state from cookies:', storedState);

  if (!state || state !== storedState) {
    console.warn('State mismatch!');
    return res.redirect('/?error=invalid_state');
  }

  try {
    // استبدال code بـ access token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
        scope: 'identify email messages.read'
      })
    });

    const tokenData = await tokenResponse.json();
    console.log('Token response:', tokenData);

    if (!tokenData.access_token) {
      console.error('No access token received!');
      return res.redirect('/?error=authentication_failed');
    }

    // الحصول على بيانات المستخدم
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = await userResponse.json();
    console.log('User data:', userData);

    // حفظ token في cookie آمن - FIXED
    // في production، نستخدم SameSite=None مع Secure
    // في development، نستخدم SameSite=Lax بدون Secure
    const isProd = process.env.NODE_ENV === 'production' || req.headers.host.includes('vercel.app');
    
    const cookieOptions = isProd 
      ? 'HttpOnly; Path=/; Max-Age=604800; SameSite=None; Secure'
      : 'HttpOnly; Path=/; Max-Age=604800; SameSite=Lax';
    
    const userCookieOptions = isProd
      ? 'Path=/; Max-Age=604800; SameSite=None; Secure'
      : 'Path=/; Max-Age=604800; SameSite=Lax';

    res.setHeader('Set-Cookie', [
      `discord_token=${tokenData.access_token}; ${cookieOptions}`,
      `user_data=${encodeURIComponent(JSON.stringify(userData))}; ${userCookieOptions}`
    ]);

    console.log('Cookies set. Redirecting to home page.');

    // إعادة التوجيه للصفحة الرئيسية
    res.redirect('/');

  } catch (error) {
    console.error('Callback error:', error);
    res.redirect('/?error=server_error');
  }
};