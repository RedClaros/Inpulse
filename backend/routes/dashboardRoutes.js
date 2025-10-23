const express = require('express');
const { prisma } = require('../lib/clients');
const authenticateToken = require('../lib/authMiddleware');

const router = express.Router();

router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
    const sixtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 60));

    // --- Revenue & Reach ---
    const [currentRevenueResult, previousRevenueResult] = await Promise.all([
      prisma.sale.aggregate({
        _sum: { revenue: true },
        where: { userId, createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.sale.aggregate({
        _sum: { revenue: true },
        where: { userId, createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
      }),
    ]);

    const [currentReachResult, previousReachResult] = await Promise.all([
      prisma.campaign.aggregate({
        _sum: { reach: true },
        where: { userId, createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.campaign.aggregate({
        _sum: { reach: true },
        where: { userId, createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
      }),
    ]);

    const totalRevenueCurrent = currentRevenueResult._sum.revenue || 0;
    const totalRevenuePrevious = previousRevenueResult._sum.revenue || 0;
    const totalReachCurrent = currentReachResult._sum.reach || 0;
    const totalReachPrevious = previousReachResult._sum.reach || 0;

    const calculateChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const revenueChange = calculateChange(totalRevenueCurrent, totalRevenuePrevious);
    const reachChange = calculateChange(totalReachCurrent, totalReachPrevious);

    // --- Engagement Rate ---
    const [totalClicksCurrent, totalClicksPrevious] = await Promise.all([
      prisma.campaign.aggregate({
        _sum: { clicks: true },
        where: { userId, createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.campaign.aggregate({
        _sum: { clicks: true },
        where: { userId, createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
      }),
    ]);

    const engagementRate = totalReachCurrent > 0
      ? (totalClicksCurrent._sum.clicks || 0) / totalReachCurrent * 100
      : 0;
    const engagementRateChange = calculateChange(
      totalClicksCurrent._sum.clicks || 0,
      totalClicksPrevious._sum.clicks || 0
    );

    // --- Conversions ---
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

    // --- Net Profit Margin ---
    const totalSpendResult = await prisma.campaign.aggregate({
      _sum: { spend: true },
      where: { userId, createdAt: { gte: thirtyDaysAgo } },
    });

    const totalSpend = totalSpendResult._sum.spend || 0;
    const netProfitMargin = totalRevenueCurrent > 0
      ? ((totalRevenueCurrent - totalSpend) / totalRevenueCurrent) * 100
      : 0;

    // --- Tasks & Burnout ---
    const tasks = await prisma.task.findMany({ where: { userId } });
    const teamMembers = await prisma.user.findMany({ where: { id: userId } });

    const totalTasks = tasks.length;
    const doneTasks = tasks.filter(t => t.status === 'DONE').length;
    const completionRate = totalTasks > 0
      ? Math.round((doneTasks / totalTasks) * 100)
      : 0;

    const highPriorityTasks = tasks.filter(t => t.priority === 'high' && t.status !== 'DONE').length;
    const overdueTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE').length;
    const stressRatio = (highPriorityTasks + overdueTasks) / (teamMembers.length || 1);

    let burnoutRisk = 'Low';
    if (stressRatio > 5) burnoutRisk = 'High';
    else if (stressRatio > 2) burnoutRisk = 'Medium';

    // --- Customer Segment (optional) ---
    let customerSegment = null;
    try {
      const topSegment = await prisma.customerSegment.findFirst({
        where: { userId },
        orderBy: { size: 'desc' }
      });
      if (topSegment) {
        customerSegment = {
          name: topSegment.name,
          size: `${topSegment.size}% of new customers`
        };
      }
    } catch (e) {
      customerSegment = null;
    }

    // --- AI Insight ---
    const actionableInsight = {
      text: totalRevenueCurrent > 1000
        ? "Revenue is trending upward. Consider scaling campaigns."
        : "Not enough data to generate an insight."
    };

    // --- Final Response ---
    const dashboardData = {
      totalRevenue: totalRevenueCurrent,
      revenueChange,
      totalReach: totalReachCurrent,
      reachChange,
      engagementRate,
      engagementRateChange,
      totalConversions,
      totalConversionsChange,
      teamPerformance: {
        completionRate,
        burnoutRisk
      },
      financials: { netProfitMargin },
      customerSegment,
      actionableInsight
    };

    res.status(200).json(dashboardData);
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard data." });
  }
});
