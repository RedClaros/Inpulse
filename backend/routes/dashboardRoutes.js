// routes/dashboardRoutes.js - FINAL and COMPLETE version

const express = require('express');
const { prisma } = require('../lib/clients');
const authenticateToken = require('../lib/authMiddleware');

const router = express.Router();

// This is your existing endpoint for the KPI cards
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;
        const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30));
        const sixtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 60));

        const currentRevenueResult = await prisma.sale.aggregate({
            _sum: { revenue: true },
            where: { userId: userId, createdAt: { gte: thirtyDaysAgo } },
        });
        const currentReachResult = await prisma.campaign.aggregate({
            _sum: { reach: true },
            where: { userId: userId, createdAt: { gte: thirtyDaysAgo } },
        });
        const totalRevenueCurrent = currentRevenueResult._sum.revenue || 0;
        const totalReachCurrent = currentReachResult._sum.reach || 0;

        const previousRevenueResult = await prisma.sale.aggregate({
            _sum: { revenue: true },
            where: { userId: userId, createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
        });
        const previousReachResult = await prisma.campaign.aggregate({
            _sum: { reach: true },
            where: { userId: userId, createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
        });
        const totalRevenuePrevious = previousRevenueResult._sum.revenue || 0;
        const totalReachPrevious = previousReachResult._sum.reach || 0;
        
        const calculateChange = (current, previous) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return ((current - previous) / previous) * 100;
        };

        const revenueChange = calculateChange(totalRevenueCurrent, totalRevenuePrevious);
        const reachChange = calculateChange(totalReachCurrent, totalReachPrevious);

	const totalClicksCurrent = await prisma.campaign.aggregate({
  		_sum: { clicks: true },
  	where: { userId, createdAt: { gte: thirtyDaysAgo } }
	});
	const totalClicksPrevious = await prisma.campaign.aggregate({
  	_sum: { clicks: true },
  	where: { userId, createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } }
	});

const engagementRate = totalReachCurrent > 0
  ? (totalClicksCurrent._sum.clicks || 0) / totalReachCurrent * 100
  : 0;
const engagementRateChange = calculateChange(
  totalClicksCurrent._sum.clicks || 0,
  totalClicksPrevious._sum.clicks || 0
);

const [currentConversions, previousConversions] = await Promise.all([
  prisma.campaign.aggregate({
    _sum: { conversions: true },
    where: { userId, createdAt: { gte: thirtyDaysAgo } },
  }),
  prisma.campaign.aggregate({
    _sum: { conversions: true },
    where: { userId, createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
  }),
]);

const totalConversions = currentConversions._sum.conversions || 0;
const totalConversionsChange = calculateChange(
  totalConversions,
  previousConversions._sum.conversions || 0
);

	// Fetch all necessary data in parallel
        const [tasks, teamMembers] = await Promise.all([
            prisma.task.findMany({ where: { userId } }),
            prisma.user.findMany({ where: { id: userId } })
        ]);

        const totalTasks = await prisma.task.count({ where: { userId: userId } });
        const doneTasks = await prisma.task.count({ where: { userId: userId, status: 'DONE' } });
        const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

	// --- NEW: Burnout Risk Calculation ---
        const now = new Date();
        const highPriorityTasks = tasks.filter(t => t.priority === 'high' && t.status !== 'DONE').length;
        const overdueTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'DONE').length;
        
        const stressfulTaskCount = highPriorityTasks + overdueTasks;
        const teamSize = teamMembers.length || 1; // Avoid division by zero
        const stressRatio = stressfulTaskCount / teamSize;

        let burnoutRisk = 'Low';
        if (stressRatio > 5) {
            burnoutRisk = 'High';
        } else if (stressRatio > 2) {
            burnoutRisk = 'Medium';
        }
	
        const dashboardData = {
            totalRevenue: totalRevenueCurrent, revenueChange: revenueChange,
            totalReach: totalReachCurrent, reachChange: reachChange,
            engagementRate, engagementRateChange,
            totalConversions, totalConversionsChange,
            teamPerformance: {
                completionRate: completionRate,
                burnoutRisk: burnoutRisk
            },
            financials: { netProfitMargin: 0 },
            customerSegment: { name: "N/A", size: "0% of new customers" },
            actionableInsight: { text: "Not enough data to generate an insight." }
        };
        res.status(200).json(dashboardData);
    } catch (error) {
        console.error("Dashboard stats error:", error);
        res.status(500).json({ error: "Failed to fetch dashboard data." });
    }
});

router.get('/revenue-chart', authenticateToken, async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const salesData = await prisma.sale.findMany({
            where: {
                userId: req.userId,
                createdAt: { gte: thirtyDaysAgo },
            },
            orderBy: { createdAt: 'asc' },
        });

        const dailyRevenue = salesData.reduce((acc, sale) => {
            const date = sale.createdAt.toISOString().split('T')[0];
            if (!acc[date]) { acc[date] = 0; }
            acc[date] += sale.revenue;
            return acc;
        }, {});

        const chartData = Object.keys(dailyRevenue).map(date => ({
            date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            revenue: parseFloat(dailyRevenue[date].toFixed(2)),
        }));
        
        res.status(200).json(chartData);
    } catch (error) {
        console.error("Revenue chart data error:", error);
        res.status(500).json({ error: "Failed to fetch revenue data." });
    }
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    // Example: fetch user info using token payload
    const userId = req.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Dashboard access granted', user });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;