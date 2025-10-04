const fetch = require('node-fetch');

const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

module.exports = async (req, res) => {
  const state = Math.random().toString(36).substring(2);
  
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'identify email messages.read',
    state: state
  });

  const url = `https://discord.com/api/oauth2/authorize?${params}`;
  
  res.setHeader('Set-Cookie', `oauth_state=${state}; HttpOnly; Path=/; Max-Age=300; SameSite=Lax`);
  res.redirect(url);
};