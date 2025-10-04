const fetch = require('node-fetch');

const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

module.exports = async (req, res) => {
  const { code, state } = req.query;
  
  // استخراج الـ state من الـ cookies
  const cookieHeader = req.headers.cookie || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => c.trim().split('='))
  );
  const storedState = cookies.oauth_state;

  if (!state || state !== storedState) {
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

    if (!tokenData.access_token) {
      return res.redirect('/?error=authentication_failed');
    }

    // الحصول على بيانات المستخدم
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = await userResponse.json();

    // حفظ token في cookie آمن
    res.setHeader('Set-Cookie', [
      `discord_token=${tokenData.access_token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax; Secure`,
      `user_data=${encodeURIComponent(JSON.stringify(userData))}; Path=/; Max-Age=86400; SameSite=Lax`
    ]);

    res.redirect('/');

  } catch (error) {
    console.error('Callback error:', error);
    res.redirect('/?error=server_error');
  }
};