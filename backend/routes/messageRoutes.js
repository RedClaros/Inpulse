// routes/messageRoutes.js
const express = require('express');
const router = express.Router();
const { prisma } = require('../lib/clients');
const authenticateToken = require('../lib/authMiddleware');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

// We create the upload instance here, but we will call it manually below
// to add better error handling.
const upload = multer({
    storage: storage,
    limits: { fileSize: 25 * 1024 * 1024 } // 25 MB limit
});

// --- Text message route (no changes) ---
router.post('/', authenticateToken, async (req, res) => {
    // ... this function remains the same ...
    try {
        const { conversationId, content } = req.body;
        const senderId = req.user.id;

        if (!conversationId || !content) {
            return res.status(400).json({ error: 'Conversation ID and content are required.' });
        }
        
        const [newMessage] = await prisma.$transaction([
            prisma.message.create({
                data: {
                    content: content,
                    conversationId: conversationId,
                    senderId: senderId,
                    type: 'TEXT',
                },
            }),
            prisma.conversation.update({
                where: { id: conversationId },
                data: { updatedAt: new Date() },
            })
        ]);

        res.status(201).json(newMessage);

    } catch (error) {
        console.error("Error creating message:", error);
        res.status(500).json({ error: 'Failed to send message.' });
    }
});


// --- File upload route (WITH NEW DEBUGGING) ---
router.post('/upload', authenticateToken, (req, res) => {
    
    // Create an instance of the Multer middleware
    const uploadMiddleware = upload.single('file');

    // Manually call the middleware to get access to its error handling
    uploadMiddleware(req, res, async function (err) {
        // --- NEW: CATCH MULTER-SPECIFIC ERRORS ---
        if (err instanceof multer.MulterError) {
            console.error('A Multer error occurred:', err);
            return res.status(500).json({ error: `File upload error: ${err.message}` });
        } else if (err) {
            // An unknown error occurred when uploading.
            console.error('An unknown upload error occurred:', err);
            return res.status(500).json({ error: 'An unknown error occurred during file upload.' });
        }

        // --- CHECKPOINT 1: If you see this log, Multer succeeded. ---
        console.log('--- Multer has processed the file. Now running route logic. ---');
        console.log('Request File:', req.file); // Log the file details
        console.log('Request Body:', req.body); // Log the body details

        // If we get here, Multer did its job and did not find an error.
        // The rest of your original logic now goes inside this callback.
        try {
            const { conversationId } = req.body;
            const senderId = req.user.id;
            const file = req.file;

            if (!conversationId || !file) {
                return res.status(400).json({ error: 'Conversation ID and a file are required.' });
            }

            const [newMessage] = await prisma.$transaction([
                prisma.message.create({
                    data: {
                        content: `/uploads/${file.filename}`,
                        type: 'FILE',                       
                        fileName: file.originalname,
                        conversationId: conversationId,
                        senderId: senderId,
                    },
                }),
                prisma.conversation.update({
                    where: { id: conversationId },
                    data: { updatedAt: new Date() },
                })
            ]);
            
            res.status(201).json(newMessage);

        } catch (error) {
            console.error("Error in file upload route logic:", error);
            res.status(500).json({ error: 'Failed to save file message.' });
        }
    });
});

module.exports = router;