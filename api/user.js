const fetch = require('node-fetch');

// Cache للطلبات المتكررة
const cache = new Map();
const CACHE_DURATION = 5000; // 5 ثواني

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
    console.log('No token found in cookies');
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const endpoint = req.query.endpoint || 'users/@me';
  const method = req.method || 'GET';
  
  // استخدام cache للطلبات المتكررة على users/@me
  const cacheKey = `${token}-${endpoint}`;
  if (method === 'GET' && endpoint === 'users/@me') {
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log('Returning cached response for users/@me');
      return res.status(200).json(cached.data);
    }
  }

  try {
    const fetchOptions = {
      method: method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const response = await fetch(`https://discord.com/api/${endpoint}`, fetchOptions);

    console.log('Discord API response status:', response.status);

    // التحقق من انتهاء صلاحية التوكن
    if (response.status === 401) {
      console.log('Token expired or invalid');
      // مسح الـ cache
      cache.delete(cacheKey);
      res.setHeader('Set-Cookie', [
        `discord_token=; HttpOnly; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`,
        `user_data=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
      ]);
      return res.status(401).json({ error: 'Token expired' });
    }

    // للطلبات DELETE، قد لا يكون هناك body
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = { success: response.ok };
    }

    // التحقق من rate limits
    if (response.headers.get('x-ratelimit-remaining')) {
      data.rateLimit = {
        remaining: response.headers.get('x-ratelimit-remaining'),
        reset: response.headers.get('x-ratelimit-reset'),
        limit: response.headers.get('x-ratelimit-limit')
      };
    }

    // حفظ في cache إذا كان users/@me
    if (method === 'GET' && endpoint === 'users/@me' && response.ok) {
      cache.set(cacheKey, {
        data: data,
        timestamp: Date.now()
      });
      console.log('Cached users/@me response');
    }

    res.status(response.status).json(data);

  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};