module.exports = async (req, res) => {
  res.status(200).json({ 
    success: true,
    message: 'Hello from API!',
    time: new Date().toISOString()
  });
};