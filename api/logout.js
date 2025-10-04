module.exports = async (req, res) => {
  res.setHeader('Set-Cookie', [
    'discord_token=; HttpOnly; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'user_data=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
  ]);
  
  res.redirect('/');
};