// routes/conversationRoutes.js - FINAL VERSION

const express = require('express');
const router = express.Router();
const { prisma } = require('../lib/clients'); // Using the shared client
const authenticateToken = require('../lib/authMiddleware');

// Route 1: GET /api/conversations
// Fetches the list of all conversations for the logged-in user.
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const conversations = await prisma.conversation.findMany({
            where: {
                participants: {
                    some: { id: userId },
                },
            },
            include: {
                participants: {
                    where: {
                        id: { not: userId },
                    },
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        avatar: true,
                    },
                },
                // Also include the latest message to display in the conversation list
                messages: {
                    orderBy: {
                        createdAt: 'desc',
                    },
                    take: 1,
                },
            },
        });

        const formattedConversations = conversations.map(convo => {
            const lastMessage = convo.messages[0];
            return {
                id: convo.id,
                participant: convo.participants[0],
                // Provide last message details for the preview
                lastMessage: lastMessage ? lastMessage.content : "No messages yet.",
                lastMessageTimestamp: lastMessage ? lastMessage.createdAt : convo.updatedAt,
            };
        }).filter(convo => convo.participant); // Ensure there's another participant

        res.json(formattedConversations);
    } catch (error) {
        console.error("Error in GET /api/conversations:", error);
        res.status(500).json({ error: "Failed to fetch conversations." });
    }
});


// --- NEW ROUTE ADDED BELOW ---

// Route 2: GET /api/conversations/:id
// Fetches all the details and messages for a SINGLE conversation.
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id: conversationId } = req.params; // Get the conversation ID from the URL parameter

        // Find the specific conversation by its ID
        const conversation = await prisma.conversation.findUnique({
            where: {
                id: conversationId,
                // Security check: Make sure the current user is a participant
                participants: {
                    some: { id: userId },
                },
            },
            include: {
                // Include all messages in the conversation, sorted by oldest first
                messages: {
                    orderBy: {
                        createdAt: 'asc',
                    },
                },
                // Include the other participant's data
                participants: {
                    where: {
                        id: { not: userId },
                    },
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        avatar: true,
                    },
                },
            },
        });

        // If no conversation is found (or user is not a participant), return an error
        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found or access denied.' });
        }

        // Format the response to be exactly what the frontend needs
        const formattedResponse = {
            id: conversation.id,
            messages: conversation.messages,
            participant: conversation.participants[0], // The other user in the chat
        };

        res.json(formattedResponse);
    } catch (error) {
        console.error(`Error in GET /api/conversations/${req.params.id}:`, error);
        res.status(500).json({ error: 'Failed to fetch conversation details.' });
    }
});

// POST /api/conversations/start
router.post('/start', authenticateToken, async (req, res) => {
    try {
        const { participantId } = req.body; // The ID of the user we want to message
        const creatorId = req.user.id;

        if (!participantId) {
            return res.status(400).json({ error: 'Participant ID is required.' });
        }

        if (participantId === creatorId) {
            return res.status(400).json({ error: 'You cannot start a conversation with yourself.' });
        }

        // 1. Check if a conversation between these two users already exists
        const existingConversation = await prisma.conversation.findFirst({
            where: {
                AND: [
                    { participants: { some: { id: creatorId } } },
                    { participants: { some: { id: participantId } } }
                ]
            }
        });

        if (existingConversation) {
            // If it exists, just return its ID
            return res.json({ conversationId: existingConversation.id });
        }

        // 2. If it doesn't exist, create a new conversation
        const newConversation = await prisma.conversation.create({
            data: {
                participants: {
                    connect: [
                        { id: creatorId },
                        { id: participantId }
                    ]
                }
            }
        });

        res.status(201).json({ conversationId: newConversation.id });

    } catch (error) {
        console.error("Error starting conversation:", error);
        res.status(500).json({ error: "Failed to start conversation." });
    }
});


module.exports = router;