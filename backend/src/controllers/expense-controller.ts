import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Fetch months for the authenticated user
export const getMonths = async (req: AuthenticatedRequest, res: Response) => {
  const months = await prisma.month.findMany({
    where: { userId: req.userId },
    orderBy: [{ year: 'asc' }, { month: 'asc' }],
  });
  res.json(months);
};

// Add a tracking month
export const addMonth = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { month, year } = req.body;
    const newMonth = await prisma.month.create({
      data: { month, year: parseInt(year), userId: req.userId! },
    });
    res.status(201).json(newMonth);
  } catch (error) {
    res.status(400).json({ error: 'Month configuration already exists.' });
  }
};

// Fetch user savings accounts
export const getAccounts = async (req: AuthenticatedRequest, res: Response) => {
  const accounts = await prisma.savingsAccount.findMany({
    where: { userId: req.userId },
  });
  res.json(accounts);
};

// Create a savings account
export const addAccount = async (req: AuthenticatedRequest, res: Response) => {
  const { name } = req.body;
  const account = await prisma.savingsAccount.create({
    data: { name, userId: req.userId! },
  });
  res.status(201).json(account);
};

// Post a new ledger transaction
export const addTransaction = async (req: AuthenticatedRequest, res: Response) => {
  const { type, amount, date, label, monthId, accountId } = req.body;
  const transaction = await prisma.transaction.create({
    data: { type, amount: parseFloat(amount), date, label, monthId, accountId },
  });
  res.status(201).json(transaction);
};