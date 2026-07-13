import { describe, it, expect, vi } from 'vitest';
import { performAtomicUpdate } from './storageService';
import { update, ref } from 'firebase/database';

vi.mock('firebase/database', () => ({
    update: vi.fn(),
    ref: vi.fn(),
    onValue: vi.fn(),
    set: vi.fn(),
    remove: vi.fn()
}));

vi.mock('./firebaseService', () => ({
    db: {}
}));

describe('performAtomicUpdate', () => {
    it('should successfully update data', async () => {
        const mockUpdates = { 'some/path': 'value' };
        vi.mocked(update).mockResolvedValue(undefined);
        vi.mocked(ref).mockReturnValue('mocked_ref' as any);

        await performAtomicUpdate(mockUpdates);

        expect(ref).toHaveBeenCalled();
        expect(update).toHaveBeenCalledWith('mocked_ref', mockUpdates);
    });

    it('should propagate error when update fails', async () => {
        const mockUpdates = { 'some/path': 'value' };
        const mockError = new Error('Update failed');
        vi.mocked(update).mockRejectedValue(mockError);
        vi.mocked(ref).mockReturnValue('mocked_ref' as any);

        await expect(performAtomicUpdate(mockUpdates)).rejects.toThrow('Update failed');

        expect(ref).toHaveBeenCalled();
        expect(update).toHaveBeenCalledWith('mocked_ref', mockUpdates);
    });
});
