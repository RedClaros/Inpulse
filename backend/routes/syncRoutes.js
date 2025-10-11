// routes/syncRoutes.js - UPDATED WITH SIMULATION MODE

const express = require('express');
const axios = require('axios');
const { AES, enc } = require('crypto-js');
const { prisma } = require('../lib/clients');
const authenticateToken = require('../lib/authMiddleware');

const router = express.Router();

// This function generates realistic-looking fake campaign data
function generateMockCampaignData(userId) {
    const platforms = ['Facebook', 'Instagram'];
    const mockCampaigns = [];
    for (let i = 1; i <= 5; i++) {
        const platform = platforms[Math.floor(Math.random() * platforms.length)];
        const reach = Math.floor(Math.random() * 20000) + 5000;
        const clicks = Math.floor(reach * (Math.random() * 0.05 + 0.01));
        const spend = parseFloat((clicks * (Math.random() * 1.5 + 0.5)).toFixed(2));
        const sales = parseFloat((clicks * (Math.random() * 0.1) * 50).toFixed(2));

        mockCampaigns.push({
            campaignName: `Mock Campaign ${i} (${platform})`,
            platform: platform,
            status: 'Active',
            reach,
            clicks,
            spend,
            sales,
            userId,
        });
    }
    return mockCampaigns;
}

router.post('/facebook', authenticateToken, async (req, res) => {
    // --- SIMULATION MODE CHECK ---
    // If USE_MOCK_DATA is set to 'true' in your .env file, run the simulation.
    if (process.env.USE_MOCK_DATA === 'true') {
        try {
            const userId = req.user.id;
            const mockData = generateMockCampaignData(userId);
            
            await prisma.campaign.deleteMany({
                where: { userId: userId, campaignName: { contains: 'Mock Campaign' } }
            });
            
            await prisma.campaign.createMany({ data: mockData });

            return res.status(200).json({ message: `Successfully synced ${mockData.length} MOCK campaigns.` });
        } catch (error) {
            console.error("Mock data sync error:", error);
            return res.status(500).json({ error: 'Failed to sync mock data.' });
        }
    }

    // --- REAL API LOGIC ---
    // If USE_MOCK_DATA is not 'true', the app will run your original code below.
    try {
        // **BUG FIX:** The user object from the token is on `req.user`, not `req`.
        const userId = req.user.id;

        const integration = await prisma.integration.findFirst({
            where: { userId: userId, platform: 'Facebook' },
        });

        if (!integration) {
            return res.status(404).json({ error: 'Facebook integration not found for this user.' });
        }

        const decryptedAccessToken = AES.decrypt(integration.accessToken, process.env.ENCRYPTION_SECRET).toString(enc.Utf8);
        const adAccountsResponse = await axios.get(`https://graph.facebook.com/v19.0/me/adaccounts?fields=campaigns{name,reach,spend,clicks,effective_status}&access_token=${decryptedAccessToken}`);
        const campaignsFromFacebook = adAccountsResponse.data.data[0]?.campaigns?.data || [];

        if (campaignsFromFacebook.length === 0) {
            return res.status(200).json({ message: 'No campaigns found on Facebook to sync.' });
        }

        for (const fbCampaign of campaignsFromFacebook) {
            const campaignData = {
                campaignName: fbCampaign.name,
                platform: 'Facebook',
                status: fbCampaign.effective_status || 'UNKNOWN',
                reach: fbCampaign.reach || 0,
                spend: parseFloat(fbCampaign.spend || 0),
                sales: 0,
                clicks: fbCampaign.clicks || 0,
                userId: userId,
            };

            await prisma.campaign.upsert({
                where: { campaignName_platform_userId: { campaignName: campaignData.campaignName, platform: 'Facebook', userId: userId } },
                update: campaignData,
                create: campaignData,
            });
        }

        res.status(200).json({ message: `Successfully synced ${campaignsFromFacebook.length} real campaigns.` });

    } catch (error) {
        console.error("Facebook sync error:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to sync data from Facebook.' });
    }
});

module.exports = router;