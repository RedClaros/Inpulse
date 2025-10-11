// routes/journeyRoutes.js
const express = require('express');
const { prisma } = require('../lib/clients');
const authenticateToken = require('../lib/authMiddleware');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
    try {
        const journeys = await prisma.customerJourney.findMany({
            where: { userId: req.userId },
            // This is the key: include the related touchpoints for each journey
            include: {
                touchpoints: {
                    orderBy: {
                        timestamp: 'asc' // Order touchpoints chronologically
                    }
                }
            }
        });
        res.status(200).json(journeys);
    } catch (error) {
        console.error("Error fetching journeys:", error);
        res.status(500).json({ error: 'Failed to fetch journey data.' });
    }
});

module.exports = router;