// routes/productRoutes.js
const express = require('express');
const { prisma } = require('../lib/clients');
const authenticateToken = require('../lib/authMiddleware');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
    try {
        // Fetch all products that belong to the logged-in user
        const products = await prisma.product.findMany({
            where: { userId: req.userId },
            // Include all the sales related to each product so we can count them
            include: {
                sales: true, 
            },
        });

        // Process the data to add calculated fields
        const productData = products.map(p => {
            const totalSalesCount = p.sales.length;
            const profitMargin = p.salePrice > 0 ? ((p.salePrice - p.costPerUnit) / p.salePrice) * 100 : 0;

            // Create a new object without the nested 'sales' array to keep the response clean
            const { sales, ...productWithoutSales } = p;

            return {
                ...productWithoutSales,
                totalSalesCount,
                profitMargin
            }
        })

        res.status(200).json(productData);
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ error: 'Failed to fetch product data.' });
    }
});

module.exports = router;