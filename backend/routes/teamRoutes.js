// routes/teamRoutes.js - CORRECTED AND COMPLETE

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { prisma } = require('../lib/clients');
const authenticateToken = require('../lib/authMiddleware');
const { sendInvitationEmail } = require('../lib/email');
const { requireRole } = require('../lib/permissionMiddleware');

// --- NEW ROUTE ADDED ---
// GET /api/team - Fetches all users (team members)
router.get('/', authenticateToken, async (req, res) => {
    try {
        // 1. Find the currently logged-in user to identify their team.
        const currentUserWithTeams = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { teams: true } 
        });

        // 2. If the user isn't part of any team, return an empty list.
        if (!currentUserWithTeams || currentUserWithTeams.teams.length === 0) {
            return res.json([]);
        }

        // 3. Get the ID of the user's team.
        const teamId = currentUserWithTeams.teams[0].id;

        // 4. Find that team in the database and include all of its associated users.
        const teamWithMembers = await prisma.team.findUnique({
            where: { id: teamId },
            include: {
                users: { // Include all users within this team
                    select: { // Select only the data needed for the frontend
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true,
                        avatar: true
                    }
                }
            }
        });

        // 5. If the team is found, return its list of users. Otherwise, return empty.
        if (teamWithMembers) {
            res.json(teamWithMembers.users);
        } else {
            res.json([]);
        }

    } catch (error) {
        console.error("Failed to fetch team members:", error);
        res.status(500).json({ error: "Failed to fetch team members." });
    }
});

// POST /api/team/invite - Invites a new user
router.post('/invite', authenticateToken, async (req, res) => {
    try {
        const { email, role } = req.body;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'A user with this email already exists.' });
        }

        const invitationToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        await prisma.invitation.upsert({
            where: { email },
            update: { token: invitationToken, expiresAt, role },
            create: { email, role, token: invitationToken, expiresAt },
        });

        const invitationLink = `http://localhost:3000/accept-invite.html?token=${invitationToken}`;
        await sendInvitationEmail(email, invitationLink);
        
        res.status(200).json({ message: 'Invitation sent successfully.' });
    } catch (error) {
        console.error('Error sending invitation:', error);
        res.status(500).json({ error: 'Failed to send invitation.' });
    }
});

// --- NEW ROUTE: Deletes a team member ---
router.delete('/:id', authenticateToken, requireRole(['Admin', 'Owner']), async (req, res) => {
    try {
        const { id: userIdToDelete } = req.params;
        const requestingUserId = req.user.id;

        // Prevent a user from deleting themselves
        if (userIdToDelete === requestingUserId) {
            return res.status(400).json({ error: "You cannot delete your own account." });
        }

        // Delete the user from the database
        await prisma.user.delete({
            where: { id: userIdToDelete }
        });

        res.status(204).json({ message: 'User deleted successfully.' }); // 204 No Content

    } catch (error) {
        // Handle cases where the user might not exist
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'User not found.' });
        }
        console.error("Error deleting user:", error);
        res.status(500).json({ error: 'Failed to delete user.' });
    }
});

module.exports = router;