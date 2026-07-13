import { describe, it, expect } from 'vitest';
import { generateReportData } from '../services/reportService';
import { TransactionType, PaymentMethod } from '../constants';
import type { Transaction } from '../types';

describe('generateReportData', () => {
  const entrepreneurId = 'ent1';
  const period = '2023-10';

  it('correctly calculates top customers based on revenue, count, sorting, and fallbacks', () => {
    const transactions: Transaction[] = [
      // Customer A: $500 + $200 = $700 (2 transactions)
      {
        id: 't1',
        entrepreneurId,
        type: TransactionType.INCOME,
        date: '2023-10-01',
        description: 'Service A',
        amount: 500,
        paymentMethod: PaymentMethod.CASH,
        customerName: 'Customer A'
      },
      {
        id: 't2',
        entrepreneurId,
        type: TransactionType.INCOME,
        date: '2023-10-05',
        description: 'Service B',
        amount: 200,
        paymentMethod: PaymentMethod.BANK,
        customerName: 'Customer A'
      },
      // Customer B (fallback to description split): $600 (1 transaction)
      {
        id: 't3',
        entrepreneurId,
        type: TransactionType.INCOME,
        date: '2023-10-10',
        description: 'Customer B - Consultation',
        amount: 600,
        paymentMethod: PaymentMethod.MOMO,
      },
      // Customer C (Walk-in Customer fallback since description has no hyphen or empty after split/trim): $300 (1 trans)
      {
        id: 't4',
        entrepreneurId,
        type: TransactionType.INCOME,
        date: '2023-10-15',
        description: ' ',
        amount: 300,
        paymentMethod: PaymentMethod.CASH,
      },
      // Customer D: $800 (1 transaction)
      {
        id: 't5',
        entrepreneurId,
        type: TransactionType.INCOME,
        date: '2023-10-20',
        description: 'Service C',
        amount: 800,
        paymentMethod: PaymentMethod.CREDIT,
        customerName: 'Customer D'
      },
      // Customer E: $150 (1 transaction)
      {
        id: 't6',
        entrepreneurId,
        type: TransactionType.INCOME,
        date: '2023-10-25',
        description: 'Service D',
        amount: 150,
        paymentMethod: PaymentMethod.CASH,
        customerName: 'Customer E'
      },
      // Customer F: $100 (1 transaction) -> This one should be sliced out (6th place)
      {
        id: 't7',
        entrepreneurId,
        type: TransactionType.INCOME,
        date: '2023-10-28',
        description: 'Service E',
        amount: 100,
        paymentMethod: PaymentMethod.MOMO,
        customerName: 'Customer F'
      },
      // Expense transaction - should be ignored in top customers
      {
        id: 't8',
        entrepreneurId,
        type: TransactionType.EXPENSE,
        date: '2023-10-30',
        description: 'Supplies',
        amount: 50,
        paymentMethod: PaymentMethod.CASH,
        customerName: 'Customer G'
      },
      // Out of period - should be ignored
      {
        id: 't9',
        entrepreneurId,
        type: TransactionType.INCOME,
        date: '2023-09-15',
        description: 'Old Service',
        amount: 1000,
        paymentMethod: PaymentMethod.CASH,
        customerName: 'Customer H'
      }
    ];

    const reportData = generateReportData(entrepreneurId, period, transactions);

    expect(reportData.topCustomers).toBeDefined();
    // Top 5 only
    expect(reportData.topCustomers.length).toBe(5);

    // Order: D ($800), A ($700), B ($600), Walk-in ($300), E ($150)
    // F ($100) is omitted

    expect(reportData.topCustomers[0]).toEqual({
      name: 'Customer D',
      totalRevenue: 800,
      transactionCount: 1
    });

    expect(reportData.topCustomers[1]).toEqual({
      name: 'Customer A',
      totalRevenue: 700,
      transactionCount: 2
    });

    expect(reportData.topCustomers[2]).toEqual({
      name: 'Customer B',
      totalRevenue: 600,
      transactionCount: 1
    });

    expect(reportData.topCustomers[3]).toEqual({
      name: 'Walk-in Customer',
      totalRevenue: 300,
      transactionCount: 1
    });

    expect(reportData.topCustomers[4]).toEqual({
      name: 'Customer E',
      totalRevenue: 150,
      transactionCount: 1
    });
  });
});
