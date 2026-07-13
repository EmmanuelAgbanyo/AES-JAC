import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportToCsv } from './exportService';
import saveAs from 'file-saver';
import { Transaction, Entrepreneur } from '../types';
import { TransactionType, PaymentMethod, PaidStatus } from '../constants';

// Mock file-saver
vi.mock('file-saver', () => {
  return {
    default: vi.fn(),
  };
});

// Polyfill Blob if not available (e.g. in older node versions), though Node 18+ has it.
if (typeof global.Blob === 'undefined') {
  global.Blob = class Blob {
    content: any[];
    options: any;
    constructor(content: any[], options: any) {
      this.content = content;
      this.options = options;
    }
    async text() {
      return this.content.join('');
    }
  } as any;
}

describe('exportToCsv', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should correctly format transactions and trigger download', async () => {
        const transactions: Transaction[] = [
            {
                id: '1',
                entrepreneurId: 'ent1',
                type: TransactionType.INCOME,
                date: '2023-01-01',
                description: 'Sale of goods',
                amount: 150.5,
                paymentMethod: PaymentMethod.CASH,
                paidStatus: PaidStatus.FULL,
                customerName: 'John Doe',
                productServiceCategory: 'Electronics'
            },
            {
                id: '2',
                entrepreneurId: 'ent1',
                type: TransactionType.EXPENSE,
                date: '2023-01-02',
                description: 'Office supplies "pens"',
                amount: 25.0,
                paymentMethod: PaymentMethod.MOMO,
                customerName: 'Stationery Shop',
                productServiceCategory: 'Supplies'
            }
        ];

        const entrepreneur: Entrepreneur = {
            id: 'ent1',
            name: 'Alice',
            contact: '123456789',
            businessName: 'Alice Tech Shop',
            startDate: '2022-01-01',
            preferredPaymentType: PaymentMethod.CASH
        };

        const period = '2023-01';

        await exportToCsv(transactions, entrepreneur, period);

        // Check if saveAs was called
        expect(saveAs).toHaveBeenCalledTimes(1);

        // Extract arguments
        const [blobArg, filenameArg] = vi.mocked(saveAs).mock.calls[0];

        // Ensure filename is correct
        expect(filenameArg).toBe('Transactions_Alice_Tech_Shop_2023-01.csv');

        // Check blob content
        const text = await blobArg.text();
        const lines = text.split('\n');

        // Header
        expect(lines[0]).toBe('Date,Type,Description,Amount (GHS),Payment Method,Paid Status,Customer Name,Product/Service Category');

        // Transaction 1
        expect(lines[1]).toBe('"2023-01-01","Income","Sale of goods","150.50","Cash","Full","John Doe","Electronics"');

        // Transaction 2 (Escaped quotes in description, N/A for paidStatus since expense)
        expect(lines[2]).toBe('"2023-01-02","Expense","Office supplies ""pens""","25.00","MoMo","N/A","Stationery Shop","Supplies"');
    });

    it('should handle empty transactions list gracefully', async () => {
        const entrepreneur: Entrepreneur = {
            id: 'ent1',
            name: 'Alice',
            contact: '123456789',
            businessName: 'Alice Shop',
            startDate: '2022-01-01',
            preferredPaymentType: PaymentMethod.CASH
        };

        await exportToCsv([], entrepreneur, '2023-01');

        expect(saveAs).toHaveBeenCalledTimes(1);

        const [blobArg] = vi.mocked(saveAs).mock.calls[0];
        const text = await blobArg.text();
        const lines = text.split('\n');

        // Only header plus empty line
        expect(lines[0]).toBe('Date,Type,Description,Amount (GHS),Payment Method,Paid Status,Customer Name,Product/Service Category');
        expect(lines.length).toBe(2);
        expect(lines[1]).toBe('');
    });
});
