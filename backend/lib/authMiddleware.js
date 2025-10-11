module.exports = (req, res, next) => {
  console.log('authMiddleware placeholder triggered');
  next(); // allow all requests through
};
