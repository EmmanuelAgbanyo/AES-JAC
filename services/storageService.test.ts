import { describe, it, expect, vi, beforeEach } from 'vitest';
import { writeTransaction } from './storageService';
import { set, ref } from 'firebase/database';
import { db } from './firebaseService';
import type { Transaction } from '../types';
import { TransactionType, PaymentMethod, PaidStatus } from '../constants';

// Mock firebase database module
vi.mock('firebase/database', () => {
    return {
        ref: vi.fn(),
        onValue: vi.fn(),
        set: vi.fn(),
        remove: vi.fn(),
        update: vi.fn()
    };
});

// Mock firebaseService module
vi.mock('./firebaseService', () => {
    return {
        db: {}
    };
});

describe('storageService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('writeTransaction', () => {
        it('should handle promise rejection when set fails', async () => {
            // Arrange
            const mockTransaction: Transaction = {
                id: 'tx-123',
                entrepreneurId: 'ent-123',
                type: TransactionType.INCOME,
                date: '2023-10-27',
                description: 'Test Sale',
                amount: 100,
                paymentMethod: PaymentMethod.CASH,
                paidStatus: PaidStatus.FULL
            };

            const mockError = new Error('Firebase permission denied');
            (set as any).mockRejectedValueOnce(mockError);

            const mockRefResult = { key: 'mock-ref' };
            (ref as any).mockReturnValueOnce(mockRefResult);

            // Act & Assert
            await expect(writeTransaction(mockTransaction)).rejects.toThrow('Firebase permission denied');

            // Verify correct calls were made
            expect(ref).toHaveBeenCalledWith(db, `transactions/${mockTransaction.id}`);
            expect(set).toHaveBeenCalledWith(mockRefResult, mockTransaction);
        });

        it('should successfully write transaction without undefined properties', async () => {
            // Arrange
            const mockTransaction: Transaction = {
                id: 'tx-123',
                entrepreneurId: 'ent-123',
                type: TransactionType.INCOME,
                date: '2023-10-27',
                description: 'Test Sale',
                amount: 100,
                paymentMethod: PaymentMethod.CASH,
                customerName: undefined, // undefined property should be removed
                productServiceCategory: 'Test'
            };

            (set as any).mockResolvedValueOnce(undefined);

            const mockRefResult = { key: 'mock-ref' };
            (ref as any).mockReturnValueOnce(mockRefResult);

            // Act
            await writeTransaction(mockTransaction);

            // Verify undefined was removed
            const expectedTransaction = { ...mockTransaction };
            delete expectedTransaction.customerName;

            expect(set).toHaveBeenCalledWith(mockRefResult, expectedTransaction);
        });
    });
});
