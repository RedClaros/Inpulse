// server.js - FINAL VERSION with all routes re-enabled

// 1. Load environment variables. This is the absolute first step.
require('dotenv').config();

if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) {
    console.error("FATAL ERROR: Make sure DATABASE_URL and JWT_SECRET are defined in your .env file.");
    process.exit(1); // This will stop the server from starting if secrets are missing.
}

// 2. Import all necessary modules
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const configurePassport = require('./lib/passport-config.js');
const syncRoutes = require('./routes/syncRoutes');
const salesRoutes = require('./routes/salesRoutes');
const productRoutes = require('./routes/productRoutes');
const journeyRoutes = require('./routes/journeyRoutes');
const insightRoutes = require('./routes/insightRoutes');
const teamRoutes = require('./routes/teamRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const authenticateToken = require('./lib/authMiddleware');
const messageRoutes = require('./routes/messageRoutes');
const invitationRoutes = require('./routes/invitationRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// 3. Initialize the Express app
const app = express();

// 4. Apply middleware
app.use(cors({
  origin: 'https://inpulse-frontend.onrender.com',
  credentials: true
}));


app.use(express.json());
app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use('/uploads', express.static('uploads'));

// 5. Configure Passport
configurePassport(passport);

// 6. Import and use all your application's routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const taskRoutes = require('./routes/taskRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const integrationRoutes = require('./routes/integrationRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/products', productRoutes);
app.use('/api/journeys', journeyRoutes);
app.use('/api/insight', insightRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);

// 7. A simple base route to confirm the server is working
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the InPulse API!' });
});

// 8. Finally, start the server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});