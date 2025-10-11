// routes/taskRoutes.js - CORRECTED

const express = require('express');
const router = express.Router();
const { prisma } = require('../lib/clients');
const authenticateToken = require('../lib/authMiddleware');

// GET /api/tasks - Fetches all tasks for the logged-in user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const tasks = await prisma.task.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
        });
        res.json(tasks);
    } catch (error) {
        console.error("Error fetching tasks:", error);
        res.status(500).json({ error: 'Failed to fetch tasks.' });
    }
});

// POST /api/tasks - Creates a new task
router.post('/', authenticateToken, async (req, res) => {
    try {
        // Get the task details from the request body
        const { content, assigneeId, priority, dueDate } = req.body;
        
        // --- THIS IS THE FIX ---
        // Get the ID of the logged-in user (the task creator/owner) from the token
        const creatorId = req.user.id;

        if (!content) {
            return res.status(400).json({ error: 'Task content is required.' });
        }

        const newTask = await prisma.task.create({
            data: {
                content,
                priority,
                dueDate,
                assigneeId,
                // Correctly connect the task to its owner (the creator)
                owner: {
                    connect: {
                        id: creatorId
                    }
                }
            }
        });

	// --- NEW: Generate a notification if the task is assigned to someone ---
        if (assigneeId && assigneeId !== creatorId) {
            try {
                // --- THIS IS THE CORRECTED LOGIC ---
                // We will now directly use the 'userId' scalar field to create the link.
                // This is a more direct and less error-prone way to establish the relation.
                await prisma.notification.create({
                    data: {
                        message: `${req.user.firstName} assigned you a new task: "${content}"`,
                        link: '#Productivity',
                        userId: assigneeId // Connect directly using the foreign key
                    }
                });
            } catch (notificationError) {
                // If only the notification fails, log it but don't crash the whole request
                console.error("Failed to create notification, but task was created:", notificationError);
            }
        }

        res.status(201).json(newTask);

    } catch (error) {
        console.error("Error creating task:", error);
        // This will now catch Prisma validation errors too
        res.status(500).json({ error: 'Failed to create task.' });
    }
});


// GET /api/tasks/:id - Fetches a single task by its ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const task = await prisma.task.findFirst({
            where: { id: id, userId: req.user.id } // Ensure user can only fetch their own tasks
        });
        if (!task) {
            return res.status(404).json({ error: 'Task not found.' });
        }
        res.json(task);
    } catch (error) {
        console.error("Error fetching task:", error);
        res.status(500).json({ error: 'Failed to fetch task.' });
    }
});


// PUT /api/tasks/:id - Updates a task
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const dataToUpdate = req.body;

        const updatedTask = await prisma.task.updateMany({
            where: { id: id, userId: req.user.id }, // Ensure user can only update their own tasks
            data: dataToUpdate,
        });
        
        if (updatedTask.count === 0) {
            return res.status(404).json({ error: 'Task not found or you do not have permission to edit it.' });
        }

        res.status(200).json({ message: 'Task updated successfully' });
    } catch (error) {
        console.error("Error updating task:", error);
        res.status(500).json({ error: 'Failed to update task.' });
    }
});


// DELETE /api/tasks/:id - Deletes a task
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.task.deleteMany({
            where: { id: id, userId: req.user.id } // Ensure user can only delete their own tasks
        });
        res.status(204).send(); // Success, no content to send back
    } catch (error) {
        console.error("Error deleting task:", error);
        res.status(500).json({ error: 'Failed to delete task.' });
    }
});

module.exports = router;