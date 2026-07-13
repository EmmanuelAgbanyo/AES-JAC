import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listenToTransactions } from './storageService';
import { onValue, ref } from 'firebase/database';

vi.mock('firebase/database', () => {
    return {
        ref: vi.fn(),
        onValue: vi.fn(),
        set: vi.fn(),
        remove: vi.fn(),
        update: vi.fn()
    };
});

vi.mock('./firebaseService', () => {
    return {
        db: {}
    };
});

describe('listenToTransactions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should call callback with empty array if snapshot data is null', () => {
        const callback = vi.fn();
        const mockUnsubscribe = vi.fn();

        vi.mocked(onValue).mockImplementation((dbRef, onValueCallback: any) => {
            const mockSnapshot = {
                val: () => null
            };
            onValueCallback(mockSnapshot);
            return mockUnsubscribe;
        });

        const result = listenToTransactions(callback);

        expect(result).toBe(mockUnsubscribe);
        expect(callback).toHaveBeenCalledWith([]);
    });

    it('should call callback with array of values if snapshot data is an object', () => {
        const callback = vi.fn();

        vi.mocked(onValue).mockImplementation((dbRef, onValueCallback: any) => {
            const mockSnapshot = {
                val: () => ({
                    'id1': { id: 'id1', amount: 100 },
                    'id2': { id: 'id2', amount: 200 }
                })
            };
            onValueCallback(mockSnapshot);
            return vi.fn();
        });

        listenToTransactions(callback);

        expect(callback).toHaveBeenCalledWith([
            { id: 'id1', amount: 100 },
            { id: 'id2', amount: 200 }
        ]);
    });

    it('should call callback with filtered array if snapshot data is an array', () => {
        const callback = vi.fn();

        vi.mocked(onValue).mockImplementation((dbRef, onValueCallback: any) => {
            const mockSnapshot = {
                val: () => [
                    null,
                    { id: 'id1', amount: 100 },
                    undefined,
                    { id: 'id2', amount: 200 }
                ]
            };
            onValueCallback(mockSnapshot);
            return vi.fn();
        });

        listenToTransactions(callback);

        expect(callback).toHaveBeenCalledWith([
            { id: 'id1', amount: 100 },
            { id: 'id2', amount: 200 }
        ]);
    });
});
