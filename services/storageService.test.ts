import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listenToEntrepreneurs } from './storageService';
import { onValue, ref } from 'firebase/database';

vi.mock('firebase/database', () => {
  return {
    ref: vi.fn(),
    onValue: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
    update: vi.fn(),
  };
});

vi.mock('./firebaseService', () => ({
    db: {},
}));

describe('storageService', () => {
    describe('listenToEntrepreneurs', () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        it('should call onValue and handle null data (no data)', () => {
            const mockUnsubscribe = vi.fn();
            vi.mocked(onValue).mockImplementation((dbRef, callback) => {
                // @ts-ignore
                callback({ val: () => null });
                return mockUnsubscribe;
            });

            const callback = vi.fn();
            const result = listenToEntrepreneurs(callback);

            expect(result).toBe(mockUnsubscribe);
            expect(onValue).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledWith([]);
        });

        it('should call onValue and handle object data (standard Firebase mapping)', () => {
            const mockUnsubscribe = vi.fn();
            const mockData = {
                id1: { id: 'id1', name: 'John Doe' },
                id2: { id: 'id2', name: 'Jane Smith' }
            };

            vi.mocked(onValue).mockImplementation((dbRef, callback) => {
                // @ts-ignore
                callback({ val: () => mockData });
                return mockUnsubscribe;
            });

            const callback = vi.fn();
            const result = listenToEntrepreneurs(callback);

            expect(result).toBe(mockUnsubscribe);
            expect(onValue).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledWith([
                { id: 'id1', name: 'John Doe' },
                { id: 'id2', name: 'Jane Smith' }
            ]);
        });

        it('should call onValue and handle array data (legacy data format)', () => {
            const mockUnsubscribe = vi.fn();
            const mockData = [
                null,
                { id: 'id1', name: 'John Doe' },
                { id: 'id2', name: 'Jane Smith' },
                undefined,
            ];

            vi.mocked(onValue).mockImplementation((dbRef, callback) => {
                // @ts-ignore
                callback({ val: () => mockData });
                return mockUnsubscribe;
            });

            const callback = vi.fn();
            const result = listenToEntrepreneurs(callback);

            expect(result).toBe(mockUnsubscribe);
            expect(onValue).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledWith([
                { id: 'id1', name: 'John Doe' },
                { id: 'id2', name: 'Jane Smith' }
            ]);
        });
    });
});
