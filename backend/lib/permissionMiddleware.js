// backend/lib/permissionMiddleware.js

module.exports = {
  requireRole: (allowedRoles) => {
    return (req, res, next) => {
      const userRole = req.user?.role || 'User'; // ✅ fallback role
      console.log(`User role: ${userRole}, Required: ${allowedRoles.join(', ')}`); // ✅ debug log

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ message: 'Forbidden: Insufficient permissions.' });
      }

      next();
    };
  }
};
