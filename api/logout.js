module.exports = async (req, res) => {
  // مسح cookies فقط - لا إعادة توجيه تلقائي
  res.setHeader('Set-Cookie', [
    'discord_token=; HttpOnly; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax',
    'user_data=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax',
    'oauth_state=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'
  ]);
  
  // إرجاع رد JSON بدلاً من إعادة التوجيه
  res.status(200).json({ 
    success: true, 
    message: 'تم تسجيل الخروج بنجاح' 
  });
};