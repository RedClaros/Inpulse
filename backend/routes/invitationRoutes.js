// routes/invitationRoutes.js

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../lib/clients');

// GET /api/invitations/:token - Verifies an invitation token
router.get('/:token', async (req, res) => {
    try {
        const { token } = req.params;

        const invitation = await prisma.invitation.findUnique({
            where: { token: token },
        });

        // Check if invitation exists or has expired
        if (!invitation || new Date() > new Date(invitation.expiresAt)) {
            return res.status(404).json({ error: 'Invitation is invalid or has expired.' });
        }

        // If valid, send back the email and role for the frontend form
        res.status(200).json({ email: invitation.email, role: invitation.role });

    } catch (error) {
        console.error('Error verifying invitation token:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// POST /api/invitations/accept - Creates the new user account from an invitation
router.post('/accept', async (req, res) => {
    try {
        const { token, firstName, lastName, password } = req.body;

        const invitation = await prisma.invitation.findUnique({
            where: { token: token },
        });

        if (!invitation || new Date() > new Date(invitation.expiresAt)) {
            return res.status(400).json({ error: 'Invitation is invalid or has expired.' });
        }

        // Hash the new user's password
        const passwordHash = await bcrypt.hash(password, 10);

        // Use a Prisma transaction to ensure both actions succeed or neither do
        const newUser = await prisma.$transaction(async (tx) => {
            // 1. Create the new user
            const createdUser = await tx.user.create({
                data: {
                    email: invitation.email,
                    role: invitation.role, // Assign the role from the invitation
                    firstName,
                    lastName,
                    passwordHash,
                    status: 'VERIFIED', // The user is instantly verified
                },
            });

            // 2. Delete the invitation so it cannot be used again
            await tx.invitation.delete({
                where: { id: invitation.id },
            });

            return createdUser;
        });
        
        // 3. Create a JWT for the new user so they can be logged in immediately
        const authToken = jwt.sign({ id: newUser.id }, process.env.JWT_SECRET, { expiresIn: '8h' });

        res.status(201).json({ token: authToken, message: 'Account created successfully!' });

    } catch (error) {
        console.error('Error accepting invitation:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});


module.exports = router;