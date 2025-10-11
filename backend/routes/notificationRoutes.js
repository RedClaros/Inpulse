// routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const { prisma } = require('../lib/clients');
const authenticateToken = require('../lib/authMiddleware');

// GET /api/notifications - Fetches all notifications for the current user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const notifications = await prisma.notification.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            take: 20 // Get the 20 most recent notifications
        });
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch notifications.' });
    }
});

// POST /api/notifications/mark-as-read - Marks all unread notifications as read
router.post('/mark-as-read', authenticateToken, async (req, res) => {
    try {
        await prisma.notification.updateMany({
            where: { userId: req.user.id, read: false },
            data: { read: true }
        });
        res.sendStatus(204); // Success, no content
    } catch (error) {
        res.status(500).json({ error: 'Failed to mark notifications as read.' });
    }
});

module.exports = router;