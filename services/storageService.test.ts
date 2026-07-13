import { describe, it, expect, vi } from 'vitest';
import { deleteTransaction } from './storageService';
import { remove, ref } from 'firebase/database';

vi.mock('firebase/database', () => {
    return {
        ref: vi.fn(),
        remove: vi.fn(),
        onValue: vi.fn(),
        set: vi.fn(),
        update: vi.fn(),
    };
});

vi.mock('./firebaseService', () => {
    return {
        db: {},
    };
});

describe('storageService', () => {
    describe('deleteTransaction', () => {
        it('should call remove with the correct ref for transactions', async () => {
            const mockId = 'test-tx-123';
            const mockRef = { _isMockRef: true };

            (ref as any).mockReturnValue(mockRef);
            (remove as any).mockResolvedValue(undefined);

            await deleteTransaction(mockId);

            expect(ref).toHaveBeenCalledWith(expect.anything(), `transactions/${mockId}`);
            expect(remove).toHaveBeenCalledWith(mockRef);
        });
    });
});
