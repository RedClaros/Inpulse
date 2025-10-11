// routes/insightRoutes.js
const express = require('express');
const { prisma } = require('../lib/clients');
const authenticateToken = require('../lib/authMiddleware');

const router = express.Router();

router.get('/report', authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;

        // 1. Fetch all necessary data in parallel
        const [journeys, products, campaigns] = await Promise.all([
            prisma.customerJourney.findMany({ where: { userId }, include: { touchpoints: true } }),
            prisma.product.findMany({ where: { userId }, include: { sales: true } }),
            prisma.campaign.findMany({ where: { userId } })
        ]);

        // 2. Perform "AI" Analysis
        // Insight 1: Find the top awareness channel from multi-touch journeys
        let topAwarenessPlatform = 'N/A';
        const multiTouchJourneys = journeys.filter(j => j.conversion && j.touchpoints.length > 1);
        if (multiTouchJourneys.length > 0) {
            const awarenessCounts = {};
            multiTouchJourneys.forEach(j => {
                const firstTouchpoint = j.touchpoints[0];
                awarenessCounts[firstTouchpoint.platform] = (awarenessCounts[firstTouchpoint.platform] || 0) + 1;
            });
            topAwarenessPlatform = Object.keys(awarenessCounts).reduce((a, b) => awarenessCounts[a] > awarenessCounts[b] ? a : b, 'N/A');
        }

        // Insight 2: Find a slow-moving product with high inventory
        let inventoryInsightText = "Your inventory levels are well-managed.";
        const slowMovingProduct = products
            .filter(p => p.inventoryLevel > 100 && p.sales.length < 10) // Example logic
            .sort((a, b) => b.inventoryLevel - a.inventoryLevel)[0];
        if (slowMovingProduct) {
            inventoryInsightText = `You have a high inventory (<span class="math-inline">\{slowMovingProduct\.inventoryLevel\} units\) of "</span>{slowMovingProduct.name}", which has low sales volume. Consider a clearance campaign.`;
        }

        // 3. Assemble the final report object
        const report = {
            attributionInsight: {
                text: `While some channels drive direct sales, <strong>${topAwarenessPlatform}</strong> appears to be critical for initial customer awareness in multi-touch conversion paths.`
            },
            inventoryInsight: {
                text: inventoryInsightText
            },
            generatedDate: new Date().toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        };

        res.status(200).json(report);

    } catch (error) {
        console.error("InSight report generation error:", error);
        res.status(500).json({ error: 'Failed to generate InSight report.' });
    }
});

module.exports = router;