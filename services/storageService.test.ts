import { describe, it, expect, vi } from 'vitest';
import { performAtomicUpdate } from './storageService';
import { update } from 'firebase/database';

// Mock the firebaseService to prevent actual Firebase initialization
vi.mock('./firebaseService', () => ({
    db: {}
}));

// Mock firebase/database functions
vi.mock('firebase/database', () => ({
    ref: vi.fn(),
    update: vi.fn(),
    onValue: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
}));

describe('performAtomicUpdate', () => {
    it('should successfully perform an atomic update', async () => {
        // Arrange
        const mockUpdates = {
            'path/to/data': 'newValue',
            'another/path': 123
        };
        (update as any).mockResolvedValue(undefined);

        // Act
        await expect(performAtomicUpdate(mockUpdates)).resolves.toBeUndefined();

        // Assert
        expect(update).toHaveBeenCalledTimes(1);
        // We can't easily assert the ref argument because it depends on the mock db,
        // but we can assert the updates argument
        expect(update).toHaveBeenCalledWith(undefined, mockUpdates);
    });

    it('should throw an error if the atomic update fails', async () => {
        // Arrange
        const mockUpdates = {
            'path/to/data': 'badValue'
        };
        const mockError = new Error('Permission denied');
        (update as any).mockRejectedValue(mockError);

        // Act & Assert
        await expect(performAtomicUpdate(mockUpdates)).rejects.toThrow('Permission denied');
    });
});
