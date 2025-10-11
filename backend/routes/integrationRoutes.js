// routes/integrationRoutes.js - CORRECTED

const express = require('express');
const passport = require('passport');
const router = express.Router();
const authenticateToken = require('../lib/authMiddleware');
const { prisma } = require('../lib/clients'); // Ensure this path is correct

// --- NEW ROUTE ADDED ---
// GET /api/integrations - Fetches all integrations for the logged-in user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const integrations = await prisma.integration.findMany({
            where: {
                userId: req.user.id,
            },
        });
        res.status(200).json(integrations);
    } catch (error) {
        console.error("Error fetching integrations:", error);
        res.status(500).json({ error: "Failed to fetch integrations." });
    }
});

// --- Existing Facebook Authentication Routes ---

// GET /api/integrations/auth/facebook - Starts the Facebook OAuth flow
router.get('/auth/facebook', passport.authenticate('facebook', {
  scope: [
    'public_profile', 
    'pages_read_engagement',
    'ads_read'
  ] 
}));

// GET /api/integrations/auth/facebook/callback - Facebook's callback URL
router.get('/auth/facebook/callback', authenticateToken, 
    passport.authenticate('facebook', { 
        failureRedirect: '/settings?error=true',
        session: false 
    }),
    (req, res) => {
        // On success, redirect back to the frontend's settings page
        res.redirect('http://localhost:3000/index.html#Settings?success=true');
    }
);

// --- NEW: Route to disconnect an integration ---
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Ensure the integration belongs to the user trying to delete it
        await prisma.integration.deleteMany({
            where: {
                id: id,
                userId: userId
            }
        });
        
        res.sendStatus(204); // 204 No Content indicates success
    } catch (error) {
        console.error("Error disconnecting integration:", error);
        res.status(500).json({ error: "Failed to disconnect integration." });
    }
});

module.exports = router;