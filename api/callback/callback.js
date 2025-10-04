const fetch = require('node-fetch');

const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

module.exports = async (req, res) => {
  console.log('=== CALLBACK INDEX CALLED ===');
  console.log('URL:', req.url);
  console.log('Query:', req.query);
  console.log('Method:', req.method);
  
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }

  try {
    console.log('Exchanging code for token...');
    
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
      console.log('Token error:', tokenData);
      return res.redirect('/?error=no_token');
    }

    console.log('Token received, getting user info...');
    
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = await userResponse.json();

    // Set cookies
    res.setHeader('Set-Cookie', [
      `discord_token=${tokenData.access_token}; Path=/; Max-Age=86400; SameSite=Lax`,
      `user_data=${encodeURIComponent(JSON.stringify(userData))}; Path=/; Max-Age=86400; SameSite=Lax`
    ]);

    console.log('Redirecting to main page...');
    res.redirect('/');

  } catch (error) {
    console.error('Callback error:', error);
    res.redirect('/?error=server_error');
  }
};