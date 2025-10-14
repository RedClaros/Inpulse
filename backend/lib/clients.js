const { PrismaClient } = require('@prisma/client');

// Create a single, shared instance of the Prisma client.
// This is the object your other files need to import.
const prisma = new PrismaClient();

// Export the instance in an object so the import { prisma } works.
module.exports = {
  prisma,
};