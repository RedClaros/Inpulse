// routes/salesRoutes.js
const express = require('express');
const { prisma } = require('../lib/clients');
const authenticateToken = require('../lib/authMiddleware');

const router = express.Router();

// GET all sales for the logged-in user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const sales = await prisma.sale.findMany({
            where: { userId: req.userId },
            orderBy: { createdAt: 'desc' },
        });
        res.status(200).json(sales);
    } catch (error) {
        console.error("Error fetching sales:", error);
        res.status(500).json({ error: 'Failed to fetch sales data.' });
    }
});

module.exports = router;