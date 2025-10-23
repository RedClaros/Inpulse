const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAvatarUrls() {
  try {
    const result = await prisma.user.updateMany({
      where: {
        avatar: {
          contains: 'localhost:5001'
        }
      },
      data: {
        avatar: {
          set: prisma.$queryRaw`REPLACE(avatar, 'http://localhost:5001', 'https://inpulse-3zws.onrender.com')`
        }
      }
    });

    console.log(`Updated ${result.count} user records.`);
  } catch (error) {
    console.error('Error updating avatar URLs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAvatarUrls();
