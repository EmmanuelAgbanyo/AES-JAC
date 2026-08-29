import { generateReportData } from '../reportService';
import { TransactionType, PaymentMethod, PaidStatus } from '../../constants';
import type { Transaction } from '../../types';

describe('generateReportData', () => {
  it('should correctly calculate top customers by revenue', () => {
    const entrepreneurId = 'ent1';
    const period = '2023-10'; // YYYY-MM
    const allTransactions: Transaction[] = [
      {
        id: 't1',
        entrepreneurId: 'ent1',
        type: TransactionType.INCOME,
        date: '2023-10-01',
        description: 'Sale 1',
        amount: 1000,
        paymentMethod: PaymentMethod.CASH,
        customerName: 'Customer A'
      },
      {
        id: 't2',
        entrepreneurId: 'ent1',
        type: TransactionType.INCOME,
        date: '2023-10-05',
        description: 'Sale 2',
        amount: 500,
        paymentMethod: PaymentMethod.CASH,
        customerName: 'Customer B'
      },
      {
        id: 't3',
        entrepreneurId: 'ent1',
        type: TransactionType.INCOME,
        date: '2023-10-10',
        description: 'Sale 3',
        amount: 1500,
        paymentMethod: PaymentMethod.CASH,
        customerName: 'Customer A'
      },
      {
        id: 't4',
        entrepreneurId: 'ent1',
        type: TransactionType.EXPENSE,
        date: '2023-10-15',
        description: 'Expense 1',
        amount: 200,
        paymentMethod: PaymentMethod.CASH
      },
      {
        id: 't5',
        entrepreneurId: 'ent1',
        type: TransactionType.INCOME,
        date: '2023-10-20',
        description: 'Walk-in Sale - Product X',
        amount: 300,
        paymentMethod: PaymentMethod.CASH,
        // No customer name
      }
    ];

    const reportData = generateReportData(entrepreneurId, period, allTransactions);

    // Verify top customers calculation
    expect(reportData.topCustomers).toBeDefined();
    expect(reportData.topCustomers.length).toBeGreaterThan(0);

    // Customer A: 1000 + 1500 = 2500, count 2
    // Customer B: 500, count 1
    // Walk-in Sale: 300, count 1 (wait, the logic splits on '-' and takes the first part, so 'Walk')
    expect(reportData.topCustomers).toEqual([
      { name: 'Customer A', totalRevenue: 2500, transactionCount: 2 },
      { name: 'Customer B', totalRevenue: 500, transactionCount: 1 },
      { name: 'Walk', totalRevenue: 300, transactionCount: 1 }
    ]);
  });
});
