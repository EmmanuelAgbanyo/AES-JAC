import { describe, it, expect } from 'vitest';
import { generateReportData } from '../services/reportService';
import { TransactionType, PaymentMethod, PaidStatus } from '../constants';

describe('reportService', () => {
  describe('generateReportData - Monthly Trends', () => {
    it('should correctly calculate monthly trends spanning year boundaries', () => {
      // Create some transactions spanning over the year boundary (Dec -> Jan, Nov -> Dec)
      // Selected period end: 2024-02
      // 6 Months would be: Sept 2023, Oct 2023, Nov 2023, Dec 2023, Jan 2024, Feb 2024

      const transactions = [
        {
          id: '1',
          entrepreneurId: 'e1',
          type: TransactionType.INCOME,
          date: '2023-09-15',
          description: 'Sep Income',
          amount: 100,
          paymentMethod: PaymentMethod.CASH,
          paidStatus: PaidStatus.FULL
        },
        {
          id: '2',
          entrepreneurId: 'e1',
          type: TransactionType.EXPENSE,
          date: '2023-09-20',
          description: 'Sep Expense',
          amount: 50,
          paymentMethod: PaymentMethod.CASH,
          paidStatus: PaidStatus.FULL
        },
        {
          id: '3',
          entrepreneurId: 'e1',
          type: TransactionType.INCOME,
          date: '2023-12-10',
          description: 'Dec Income',
          amount: 200,
          paymentMethod: PaymentMethod.CASH,
          paidStatus: PaidStatus.FULL
        },
        {
          id: '4',
          entrepreneurId: 'e1',
          type: TransactionType.EXPENSE,
          date: '2024-01-05',
          description: 'Jan Expense',
          amount: 150,
          paymentMethod: PaymentMethod.CASH,
          paidStatus: PaidStatus.FULL
        },
        {
          id: '5',
          entrepreneurId: 'e1',
          type: TransactionType.INCOME,
          date: '2024-02-28',
          description: 'Feb Income',
          amount: 300,
          paymentMethod: PaymentMethod.CASH,
          paidStatus: PaidStatus.FULL
        },
        // Transaction outside the 6 month window (Aug 2023)
        {
          id: '6',
          entrepreneurId: 'e1',
          type: TransactionType.INCOME,
          date: '2023-08-31',
          description: 'Aug Income',
          amount: 500,
          paymentMethod: PaymentMethod.CASH,
          paidStatus: PaidStatus.FULL
        },
      ];

      const reportData = generateReportData('e1', '2024-02', transactions);

      expect(reportData.monthlyTrends).toHaveLength(6);

      // Expected trends
      // index 0: 2023-09
      expect(reportData.monthlyTrends[0].month).toBe('Sep 23');
      expect(reportData.monthlyTrends[0].income).toBe(100);
      expect(reportData.monthlyTrends[0].expenses).toBe(50);

      // index 1: 2023-10
      expect(reportData.monthlyTrends[1].month).toBe('Oct 23');
      expect(reportData.monthlyTrends[1].income).toBe(0);
      expect(reportData.monthlyTrends[1].expenses).toBe(0);

      // index 2: 2023-11
      expect(reportData.monthlyTrends[2].month).toBe('Nov 23');
      expect(reportData.monthlyTrends[2].income).toBe(0);
      expect(reportData.monthlyTrends[2].expenses).toBe(0);

      // index 3: 2023-12
      expect(reportData.monthlyTrends[3].month).toBe('Dec 23');
      expect(reportData.monthlyTrends[3].income).toBe(200);
      expect(reportData.monthlyTrends[3].expenses).toBe(0);

      // index 4: 2024-01
      expect(reportData.monthlyTrends[4].month).toBe('Jan 24');
      expect(reportData.monthlyTrends[4].income).toBe(0);
      expect(reportData.monthlyTrends[4].expenses).toBe(150);

      // index 5: 2024-02
      expect(reportData.monthlyTrends[5].month).toBe('Feb 24');
      expect(reportData.monthlyTrends[5].income).toBe(300);
      expect(reportData.monthlyTrends[5].expenses).toBe(0);
    });
  });

  describe('generateReportData - Period Formatting', () => {
    it('should default to December when period is just YYYY', () => {
      const transactions = [
        {
          id: '1',
          entrepreneurId: 'e1',
          type: TransactionType.INCOME,
          date: '2023-12-15',
          description: 'Dec Income',
          amount: 500,
          paymentMethod: PaymentMethod.CASH,
          paidStatus: PaidStatus.FULL
        },
        {
          id: '2',
          entrepreneurId: 'e1',
          type: TransactionType.EXPENSE,
          date: '2023-10-20',
          description: 'Oct Expense',
          amount: 200,
          paymentMethod: PaymentMethod.CASH,
          paidStatus: PaidStatus.FULL
        }
      ];

      const reportData = generateReportData('e1', '2023', transactions);

      expect(reportData.monthlyTrends).toHaveLength(6);

      // Selected period: 2023. Default end date: Dec 2023.
      // 6 months: Jul, Aug, Sep, Oct, Nov, Dec

      expect(reportData.monthlyTrends[0].month).toBe('Jul 23');
      expect(reportData.monthlyTrends[0].income).toBe(0);
      expect(reportData.monthlyTrends[0].expenses).toBe(0);

      expect(reportData.monthlyTrends[3].month).toBe('Oct 23');
      expect(reportData.monthlyTrends[3].income).toBe(0);
      expect(reportData.monthlyTrends[3].expenses).toBe(200);

      expect(reportData.monthlyTrends[5].month).toBe('Dec 23');
      expect(reportData.monthlyTrends[5].income).toBe(500);
      expect(reportData.monthlyTrends[5].expenses).toBe(0);
    });
  });
});
