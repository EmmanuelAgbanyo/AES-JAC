import { describe, it, expect } from 'vitest';
import { generateReportData } from './reportService';
import { TransactionType, PaidStatus, PaymentMethod } from '../constants';
import type { Transaction } from '../types';

describe('generateReportData', () => {
  const entrepreneurId = 'e1';
  const period = '2023-10';

  const createTransaction = (
    id: string,
    amount: number,
    type: TransactionType,
    date: string,
    paidStatus: PaidStatus,
    eId: string = entrepreneurId,
    category: string = 'General'
  ): Transaction => ({
    id,
    entrepreneurId: eId,
    type,
    amount,
    date,
    description: `Test ${id}`,
    paymentMethod: PaymentMethod.CASH,
    paidStatus,
    createdAt: new Date(date).toISOString(),
    productServiceCategory: category,
  });

  it('calculates total income, expenses, and net income correctly', () => {
    const transactions = [
      createTransaction('t1', 1000, TransactionType.INCOME, '2023-10-01', PaidStatus.FULL),
      createTransaction('t2', 500, TransactionType.INCOME, '2023-10-15', PaidStatus.FULL),
      createTransaction('t3', 300, TransactionType.EXPENSE, '2023-10-05', PaidStatus.FULL),
      createTransaction('t4', 100, TransactionType.EXPENSE, '2023-10-20', PaidStatus.FULL),
    ];

    const report = generateReportData(entrepreneurId, period, transactions);

    expect(report.totalIncome).toBe(1500);
    expect(report.totalExpenses).toBe(400);
    expect(report.netIncome).toBe(1100);
  });

  it('filters transactions by entrepreneurId and period correctly', () => {
    const transactions = [
      createTransaction('t1', 1000, TransactionType.INCOME, '2023-10-01', PaidStatus.FULL, 'e1'),
      createTransaction('t2', 500, TransactionType.INCOME, '2023-09-15', PaidStatus.FULL, 'e1'), // Wrong period
      createTransaction('t3', 300, TransactionType.EXPENSE, '2023-10-05', PaidStatus.FULL, 'e2'), // Wrong entrepreneur
      createTransaction('t4', 100, TransactionType.EXPENSE, '2023-10-20', PaidStatus.FULL, 'e1'),
    ];

    const report = generateReportData('e1', period, transactions);

    expect(report.totalIncome).toBe(1000); // t1 only
    expect(report.totalExpenses).toBe(100); // t4 only
    expect(report.netIncome).toBe(900);
  });

  it('calculates outstanding receivables and collection rate correctly', () => {
    const transactions = [
      createTransaction('t1', 1000, TransactionType.INCOME, '2023-10-01', PaidStatus.FULL),
      createTransaction('t2', 500, TransactionType.INCOME, '2023-10-15', PaidStatus.PENDING),
      createTransaction('t3', 300, TransactionType.INCOME, '2023-10-20', PaidStatus.PARTIAL),
    ];

    const report = generateReportData(entrepreneurId, period, transactions);

    // Total income = 1000 + 500 + 300 = 1800
    // Outstanding receivables = 500 (pending) + 300 (partial) = 800
    // Total collected = 1800 - 800 = 1000
    // Collection rate = (1000 / 1800) * 100 = 55.55...

    expect(report.totalIncome).toBe(1800);
    expect(report.receivablesSummary.total).toBe(800);
    expect(report.receivablesSummary.count).toBe(2);
    expect(report.totalBilled).toBe(1800);
    expect(report.collectionRate).toBeCloseTo((1000 / 1800) * 100);
  });

  it('calculates income and expense categories correctly', () => {
    const transactions = [
      createTransaction('t1', 1000, TransactionType.INCOME, '2023-10-01', PaidStatus.FULL, 'e1', 'Service A'),
      createTransaction('t2', 500, TransactionType.INCOME, '2023-10-15', PaidStatus.FULL, 'e1', 'Service A'),
      createTransaction('t3', 500, TransactionType.INCOME, '2023-10-20', PaidStatus.FULL, 'e1', 'Product B'),
      createTransaction('t4', 300, TransactionType.EXPENSE, '2023-10-05', PaidStatus.FULL, 'e1', 'Rent'),
      createTransaction('t5', 100, TransactionType.EXPENSE, '2023-10-20', PaidStatus.FULL, 'e1', 'Utilities'),
    ];

    const report = generateReportData(entrepreneurId, period, transactions);

    expect(report.incomeByCategory.length).toBe(2);
    const serviceA = report.incomeByCategory.find(c => c.category === 'Service A');
    expect(serviceA?.amount).toBe(1500);
    expect(serviceA?.percentage).toBe(75); // 1500 / 2000

    const productB = report.incomeByCategory.find(c => c.category === 'Product B');
    expect(productB?.amount).toBe(500);
    expect(productB?.percentage).toBe(25); // 500 / 2000

    expect(report.expenseByCategory.length).toBe(2);
    const rent = report.expenseByCategory.find(c => c.category === 'Rent');
    expect(rent?.amount).toBe(300);
    expect(rent?.percentage).toBe(75); // 300 / 400
  });

  it('handles empty transaction arrays correctly', () => {
    const transactions: Transaction[] = [];
    const report = generateReportData(entrepreneurId, period, transactions);

    expect(report.totalIncome).toBe(0);
    expect(report.totalExpenses).toBe(0);
    expect(report.netIncome).toBe(0);
    expect(report.receivablesSummary.total).toBe(0);
    expect(report.receivablesSummary.count).toBe(0);
    expect(report.collectionRate).toBe(0);
    expect(report.incomeByCategory).toEqual([]);
    expect(report.expenseByCategory).toEqual([]);
    expect(report.averageTransactionValue).toBe(0);
  });
});
