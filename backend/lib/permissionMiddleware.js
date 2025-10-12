module.exports = (req, res, next) => {
  console.log('permissionMiddleware placeholder triggered');
  next(); // allow all requests through
};
