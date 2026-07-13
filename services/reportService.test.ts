import { describe, it, expect } from 'vitest';
import { generateFinancialStatements } from './reportService';
import { TransactionType, PaymentMethod, PaidStatus } from '../constants';
import type { Transaction } from '../types';

describe('generateFinancialStatements', () => {
  const period = '2024-03';
  const baseTransaction = {
    id: '1',
    entrepreneurId: 'ent-1',
    date: '2024-03-15',
    description: 'Test',
    paymentMethod: PaymentMethod.BANK,
    paidStatus: PaidStatus.FULL,
  };

  it('handles empty transactions array gracefully', () => {
    const result = generateFinancialStatements([], period);

    expect(result.incomeStatement.revenue).toContainEqual(
      expect.objectContaining({ label: 'No Revenue Recorded', amount: '0.00' })
    );
    expect(result.incomeStatement.expenses).toContainEqual(
      expect.objectContaining({ label: 'No Expenses Recorded', amount: '0.00' })
    );

    // Check KPI defaults when no revenue
    expect(result.kpis.grossMargin).toBe('0.0%');
    expect(result.kpis.ebitdaMargin).toBe('0.0%');
    expect(result.kpis.netMargin).toBe('0.0%');

    // Balance sheet checks
    expect(result.balanceSheet.totalAssets).toBe('0.00');
    expect(result.balanceSheet.totalLiabilitiesAndEquity).toBe('0.00');
  });

  it('calculates correctly with only income transactions', () => {
    const transactions: Transaction[] = [
      { ...baseTransaction, type: TransactionType.INCOME, amount: 1000, productServiceCategory: 'Services' },
      { ...baseTransaction, id: '2', type: TransactionType.INCOME, amount: 500, productServiceCategory: 'Products' },
    ];

    const result = generateFinancialStatements(transactions, period);

    // 1500 total, tax provision is 25% = 375, net income = 1125
    expect(result.incomeStatement.revenue.find(r => r.isTotal)?.amount).toBe('1500.00');
    expect(result.incomeStatement.taxProvision).toBe('375.00');
    expect(result.incomeStatement.netIncome).toBe('1125.00');

    expect(result.incomeStatement.expenses).toContainEqual(
      expect.objectContaining({ label: 'No Expenses Recorded', amount: '0.00' })
    );
  });

  it('calculates correctly with only expense transactions', () => {
    const transactions: Transaction[] = [
      { ...baseTransaction, type: TransactionType.EXPENSE, amount: 600, productServiceCategory: 'Rent' },
    ];

    const result = generateFinancialStatements(transactions, period);

    // -600 total, no tax provision when net income < 0
    expect(result.incomeStatement.expenses.find(r => r.isTotal)?.amount).toBe('600.00');
    expect(result.incomeStatement.taxProvision).toBe('0.00');
    expect(result.incomeStatement.netIncome).toBe('-600.00');

    expect(result.incomeStatement.revenue).toContainEqual(
      expect.objectContaining({ label: 'No Revenue Recorded', amount: '0.00' })
    );
  });

  it('calculates correctly with mixed transactions resulting in profit', () => {
    const transactions: Transaction[] = [
      { ...baseTransaction, type: TransactionType.INCOME, amount: 2000, productServiceCategory: 'Sales' },
      { ...baseTransaction, id: '2', type: TransactionType.EXPENSE, amount: 800, productServiceCategory: 'Supplies' },
    ];

    const result = generateFinancialStatements(transactions, period);

    // Revenue = 2000, Expenses = 800, Net Income before tax = 1200
    // Tax = 300, Net Income after tax = 900
    expect(result.incomeStatement.revenue.find(r => r.isTotal)?.amount).toBe('2000.00');
    expect(result.incomeStatement.expenses.find(r => r.isTotal)?.amount).toBe('800.00');
    expect(result.incomeStatement.taxProvision).toBe('300.00');
    expect(result.incomeStatement.netIncome).toBe('900.00');

    // KPIs
    // cogs = 800 * 0.4 = 320
    // grossProfit = 2000 - 320 = 1680
    // grossMargin = 1680 / 2000 = 84.0%
    expect(result.kpis.grossMargin).toBe('84.0%');
  });

  it('calculates correctly with mixed transactions resulting in loss', () => {
    const transactions: Transaction[] = [
      { ...baseTransaction, type: TransactionType.INCOME, amount: 500, productServiceCategory: 'Sales' },
      { ...baseTransaction, id: '2', type: TransactionType.EXPENSE, amount: 1500, productServiceCategory: 'Supplies' },
    ];

    const result = generateFinancialStatements(transactions, period);

    // Revenue = 500, Expenses = 1500, Net Income before tax = -1000
    // Tax = 0, Net Income after tax = -1000
    expect(result.incomeStatement.taxProvision).toBe('0.00');
    expect(result.incomeStatement.netIncome).toBe('-1000.00');
  });

  it('falls back to general categories when productServiceCategory is missing', () => {
    const transactions: Transaction[] = [
      { ...baseTransaction, type: TransactionType.INCOME, amount: 100 }, // No category
      { ...baseTransaction, id: '2', type: TransactionType.EXPENSE, amount: 50 }, // No category
    ];

    const result = generateFinancialStatements(transactions, period);

    expect(result.incomeStatement.revenue).toContainEqual(
      expect.objectContaining({ label: 'General Sales', amount: '100.00' })
    );

    expect(result.incomeStatement.expenses).toContainEqual(
      expect.objectContaining({ label: 'General Expenses', amount: '50.00' })
    );
  });

  it('calculates accounts receivable and payable correctly based on paidStatus', () => {
    const transactions: Transaction[] = [
      // Income that is full (not receivable)
      { ...baseTransaction, type: TransactionType.INCOME, amount: 100, paidStatus: PaidStatus.FULL },
      // Income that is pending (receivable)
      { ...baseTransaction, id: '2', type: TransactionType.INCOME, amount: 200, paidStatus: PaidStatus.PENDING },
      // Income that is partial (receivable)
      { ...baseTransaction, id: '3', type: TransactionType.INCOME, amount: 300, paidStatus: PaidStatus.PARTIAL },
      // Expense that is full (not payable)
      { ...baseTransaction, id: '4', type: TransactionType.EXPENSE, amount: 50, paidStatus: PaidStatus.FULL },
      // Expense that is pending (payable)
      { ...baseTransaction, id: '5', type: TransactionType.EXPENSE, amount: 150, paidStatus: PaidStatus.PENDING },
      // Expense that is partial (payable)
      { ...baseTransaction, id: '6', type: TransactionType.EXPENSE, amount: 250, paidStatus: PaidStatus.PARTIAL },
    ];

    const result = generateFinancialStatements(transactions, period);

    // Receivables = 200 + 300 = 500
    expect(result.balanceSheet.assets).toContainEqual(
      expect.objectContaining({ label: 'Accounts Receivable', amount: '500.00' })
    );

    // Payables = 150 + 250 = 400. Let's check Total Liabilities (Payables + Tax)
    // Revenue = 600, Expenses = 450, Net Income = 150, Tax Provision = 37.50
    // Total Liabilities = Accounts Payable (400) + Tax Payable (37.50) = 437.50
    expect(result.balanceSheet.liabilities).toContainEqual(
      expect.objectContaining({ label: 'Tax Payable', amount: '37.50' })
    );

    // Since we don't have an individual Accounts Payable row in liabilities,
    // we need to verify totalLiabilitiesAndEquity reflects the calculation.
    // Total Liabilities (437.50) + Total Equity
    // Total Assets = Cash (150) + Receivables (500) = 650
    expect(result.balanceSheet.totalAssets).toBe('650.00');
    expect(result.balanceSheet.totalLiabilitiesAndEquity).toBe('650.00');
  });
});
