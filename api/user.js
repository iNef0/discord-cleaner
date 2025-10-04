const fetch = require('node-fetch');

module.exports = async (req, res) => {
  console.log('User API called');
  console.log('Incoming request cookies:', req.headers.cookie);

  // استخراج التوكن من الـ cookies
  const cookieHeader = req.headers.cookie || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [key, ...rest] = c.trim().split('=');
      return [key, rest.join('=')];
    })
  );

  const token = cookies.discord_token ? decodeURIComponent(cookies.discord_token) : null;
  console.log('Using token:', token);

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const endpoint = req.query.endpoint || 'users/@me';

  try {
    const response = await fetch(`https://discord.com/api/${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    // التحقق من انتهاء صلاحية التوكن
    if (response.status === 401) {
      res.setHeader('Set-Cookie', [
        'discord_token=; HttpOnly; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'user_data=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
      ]);
      return res.status(401).json({ error: 'Token expired' });
    }

    const data = await response.json();

    // التحقق من rate limits
    if (response.headers.get('x-ratelimit-remaining')) {
      data.rateLimit = {
        remaining: response.headers.get('x-ratelimit-remaining'),
        reset: response.headers.get('x-ratelimit-reset')
      };
    }

    res.status(200).json(data);

  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
