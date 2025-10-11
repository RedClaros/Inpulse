// routes/authRoutes.js - FINAL CORRECTED VERSION

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../lib/clients');
const router = express.Router();

// ... (Your /register and /verify routes remain the same)
router.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;

        // 1. Validate input
        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ error: 'All fields are required.' });
        }

        // 2. Check if user already exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ error: 'A user with this email already exists.' });
        }

        // 3. Hash the password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // 4. Use a transaction to create the Team and User together
        const newUser = await prisma.$transaction(async (tx) => {
            
            // First, create the new Team for the user's workspace
            const newTeam = await tx.team.create({
                data: {
                    name: `${firstName}'s Workspace`
                }
            });

            // Then, create the new User and connect them to the new Team
            const user = await tx.user.create({
                data: {
                    firstName,
                    lastName,
                    email,
                    passwordHash,
                    role: 'Owner', // The first user of a new workspace is the Owner
                    teams: {
                        connect: {
                            id: newTeam.id
                        }
                    }
                }
            });

            return user;
        });

        // 5. Send a success response
        // Note: We are not sending a token back here. Login is a separate step.
        res.status(201).json({ 
            message: 'User and workspace created successfully.',
            userId: newUser.id
        });

    } catch (error) {
        console.error("Error during user registration:", error);
        res.status(500).json({ error: 'Failed to create account.' });
    }
});

router.post('/verify', async (req, res) => {
    try {
        const { email, pin } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user || user.verificationPin !== pin || new Date() > new Date(user.pinExpiresAt)) {
            return res.status(400).json({ error: 'Invalid or expired verification code.' });
        }
        
        await prisma.user.update({
            where: { email },
            data: { status: 'VERIFIED', verificationPin: null, pinExpiresAt: null },
        });

        res.status(200).json({ message: 'Account verified successfully.' });
    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ error: 'Internal server error during verification.' });
    }
});
// ... (End of unchanged routes)


router.post('/login', async (req, res) => {
    try {
        // --- FINAL FIX: Accept 'email' OR 'username' from the request body ---
        const { email, username, password } = req.body;

        // Use the value from 'email' if it exists, otherwise use 'username'.
        const loginIdentifier = email || username;

        // Check if an identifier was provided at all.
        if (!loginIdentifier) {
            return res.status(400).json({ error: 'Email or username is required.' });
        }

        const user = await prisma.user.findUnique({
            where: { email: loginIdentifier }
        });

        if (!user || user.status !== 'VERIFIED') {
            return res.status(401).json({ error: 'Invalid credentials or unverified account.' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '8h' });

        res.status(200).json({ token });
    } catch (error) {
        // We log the specific Prisma error if it occurs
        if (error.name === 'PrismaClientValidationError') {
            console.error('Prisma Validation Error during login:', error.message);
            return res.status(400).json({ error: 'Invalid login request.' });
        }
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

module.exports = router;