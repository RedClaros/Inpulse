// routes/uploadRoutes.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const { prisma } = require('../lib/clients');
const authenticateToken = require('../lib/authMiddleware');

const router = express.Router();

// Configure Multer for file storage
const storage = multer.diskStorage({
    destination: './uploads/', // The folder where files will be saved
    filename: (req, file, cb) => {
        // Create a unique filename: user-id-timestamp.extension
        const uniqueSuffix = req.user.id + '-' + Date.now() + path.extname(file.originalname);
        cb(null, uniqueSuffix);
    }
});

const upload = multer({ storage: storage });

// POST /api/upload/avatar - Handles the avatar upload
router.post('/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
    // 'upload.single('avatar')' middleware processes the file named 'avatar' from the form data.
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded.' });
        }

        const userId = req.user.id;
        // The URL that the frontend can use to access the file
        const avatarUrl = `https://inpulse-3zws.onrender.com/uploads/${req.file.filename}`;

        // Update the user's avatar URL in the database
        await prisma.user.update({
            where: { id: userId },
            data: { avatar: avatarUrl },
        });

        res.status(200).json({ newAvatarUrl: avatarUrl });

    } catch (error) {
        console.error('Error uploading avatar:', error);
        res.status(500).json({ error: 'Failed to upload avatar.' });
    }
});

module.exports = router;