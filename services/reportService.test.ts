import { describe, it, expect } from 'vitest';
import { generateReportData } from './reportService';
import type { Transaction } from '../types';
import { TransactionType, PaidStatus, PaymentMethod } from '../constants';

describe('generateReportData', () => {
  const entrepreneurId = 'ent-1';
  const period = '2023-10';

  it('should handle an empty array of transactions', () => {
    const result = generateReportData(entrepreneurId, period, []);
    expect(result.totalIncome).toBe(0);
    expect(result.totalExpenses).toBe(0);
    expect(result.netIncome).toBe(0);
    expect(result.totalBilled).toBe(0);
    expect(result.incomeByCategory.length).toBe(0);
    expect(result.expenseByCategory.length).toBe(0);
  });

  it('should correctly filter by entrepreneurId and period', () => {
    const transactions: Transaction[] = [
      {
        id: 't1',
        entrepreneurId: 'ent-1',
        date: '2023-10-01',
        type: TransactionType.INCOME,
        amount: 100,
        description: 'Test',
        paymentMethod: PaymentMethod.CASH,
      },
      { // Wrong period
        id: 't2',
        entrepreneurId: 'ent-1',
        date: '2023-09-01',
        type: TransactionType.INCOME,
        amount: 200,
        description: 'Test',
        paymentMethod: PaymentMethod.CASH,
      },
      { // Wrong entrepreneur
        id: 't3',
        entrepreneurId: 'ent-2',
        date: '2023-10-05',
        type: TransactionType.INCOME,
        amount: 300,
        description: 'Test',
        paymentMethod: PaymentMethod.CASH,
      },
    ];

    const result = generateReportData(entrepreneurId, period, transactions);
    expect(result.totalIncome).toBe(100);
  });

  it('should calculate totalIncome, totalExpenses, and totalBilled correctly', () => {
    const transactions: Transaction[] = [
      {
        id: 't1',
        entrepreneurId: 'ent-1',
        date: '2023-10-01',
        type: TransactionType.INCOME,
        amount: 500,
        description: 'Sale 1',
        paymentMethod: PaymentMethod.CASH,
        productServiceCategory: 'Services'
      },
      {
        id: 't2',
        entrepreneurId: 'ent-1',
        date: '2023-10-02',
        type: TransactionType.EXPENSE,
        amount: 200,
        description: 'Expense 1',
        paymentMethod: PaymentMethod.CASH,
        productServiceCategory: 'Supplies'
      },
      {
        id: 't3',
        entrepreneurId: 'ent-1',
        date: '2023-10-03',
        type: TransactionType.INCOME,
        amount: 300,
        description: 'Sale 2',
        paymentMethod: PaymentMethod.CASH,
        productServiceCategory: 'Products'
      },
    ];

    const result = generateReportData(entrepreneurId, period, transactions);
    expect(result.totalIncome).toBe(800);
    expect(result.totalExpenses).toBe(200);
    expect(result.netIncome).toBe(600);
    expect(result.totalBilled).toBe(800);

    expect(result.incomeByCategory).toEqual([
      { category: 'Services', amount: 500, percentage: 62.5 },
      { category: 'Products', amount: 300, percentage: 37.5 }
    ]);
    expect(result.expenseByCategory).toEqual([
      { category: 'Supplies', amount: 200, percentage: 100 }
    ]);
  });
});
