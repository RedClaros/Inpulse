// routes/campaignRoutes.js

const express = require('express');
const { prisma } = require('../lib/clients');
const authenticateToken = require('../lib/authMiddleware');

const router = express.Router();

// GET all campaigns for the logged-in user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const campaigns = await prisma.campaign.findMany({
            where: { userId: req.userId },
            orderBy: { campaignName: 'asc' },
        });
        res.status(200).json(campaigns);
    } catch (error) {
        console.error("Error fetching campaigns:", error);
        res.status(500).json({ error: 'Failed to fetch campaigns due to a server error.' });
    }
});

module.exports = router;