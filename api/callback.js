const fetch = require('node-fetch');

const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

module.exports = async (req, res) => {
  const { code, state } = req.query;

  console.log('Callback invoked');
  console.log('Received code:', code);

  // تخطي التحقق من state للتبسيط
  if (!code) {
    return res.redirect('/?error=no_code');
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
    console.log('Token response received');

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
    console.log('User data received');

    // بدلاً من cookies، نرسل البيانات عبر HTML redirect مع JavaScript
    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authenticating...</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              margin: 0;
            }
            .loading {
              text-align: center;
              background: white;
              padding: 40px;
              border-radius: 20px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            }
            .spinner {
              border: 4px solid #f3f3f3;
              border-top: 4px solid #5865F2;
              border-radius: 50%;
              width: 50px;
              height: 50px;
              animation: spin 1s linear infinite;
              margin: 0 auto 20px;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="loading">
            <div class="spinner"></div>
            <h2>جاري تسجيل الدخول...</h2>
            <p>الرجاء الانتظار</p>
          </div>
          <script>
            // حفظ البيانات في sessionStorage
            sessionStorage.setItem('discord_token', '${tokenData.access_token}');
            sessionStorage.setItem('user_data', '${encodeURIComponent(JSON.stringify(userData))}');
            
            // إعادة التوجيه للصفحة الرئيسية
            setTimeout(() => {
              window.location.href = '/';
            }, 500);
          </script>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('Callback error:', error);
    res.redirect('/?error=server_error');
  }
};