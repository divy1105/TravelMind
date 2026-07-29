import { PrismaClient } from '@prisma/client'

// Singleton Prisma client for the server process.
export const prisma = new PrismaClient()

