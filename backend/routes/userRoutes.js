// routes/userRoutes.js - CORRECTED

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { prisma } = require('../lib/clients');
const authenticateToken = require('../lib/authMiddleware');

// GET /api/user/me - Fetches data for the currently authenticated user
router.get('/me', authenticateToken, async (req, res) => {
    try {
        // The middleware already attached the user object to the request.
        // We just need to format it and send it back.
        const user = req.user;

        if (!user) {
            // This is a safety check in case the middleware fails unexpectedly
            return res.status(404).json({ error: "User not found." });
        }

        // It's good practice to not send the password hash to the frontend.
        const { passwordHash, ...userData } = user;

        // --- FIX: Explicitly send the data with a 200 OK status ---
        res.status(200).json(userData);

    } catch (error) {
        console.error("Error in userRoutes.js (/me):", error);
        res.status(500).json({ error: "Failed to get user data." });
    }
});


// PUT /api/user/me - Updates the current user's profile
router.put('/me', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { firstName, lastName } = req.body;

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { firstName, lastName },
        });

        const { passwordHash, ...userData } = updatedUser;
        res.status(200).json(userData);
        
    } catch (error) {
        console.error("Error updating user profile:", error);
        res.status(500).json({ error: "Failed to update profile." });
    }
});

// --- NEW ROUTE for changing password ---
router.put('/password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = req.user; // Get the full user object from the middleware

        // 1. Verify the user's current password
        const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Incorrect current password.' });
        }

        // 2. Hash the new password
        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        // 3. Update the password in the database
        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: newPasswordHash },
        });

        res.status(200).json({ message: 'Password updated successfully.' });

    } catch (error) {
        console.error("Error changing password:", error);
        res.status(500).json({ error: "Failed to change password." });
    }
});


module.exports = router;