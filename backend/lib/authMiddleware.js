const jwt = require('jsonwebtoken');
const { prisma } = require('./clients'); // Make sure the path is correct

const authMiddleware = async (req, res, next) => {
  // 1. Get the token from the Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // If no token is provided, deny access
    return res.status(401).json({ error: 'Unauthorized: No token provided.' });
  }

  const token = authHeader.split(' ')[1]; // Extract token from "Bearer <token>"

  try {
    // 2. Verify the token using your JWT_SECRET
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Find the user in the database based on the ID from the token
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: User not found.' });
    }

    // 4. Attach the user object to the request for other routes to use
    req.user = user;

    // 5. Continue to the next middleware or the actual route
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    return res.status(401).json({ error: 'Unauthorized: Invalid token.' });
  }
};

module.exports = authMiddleware;