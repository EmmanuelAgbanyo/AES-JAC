import { describe, it, expect, vi, beforeEach } from 'vitest';
import { writeEntrepreneur } from './storageService';
import { set, ref } from 'firebase/database';
import { db } from './firebaseService';
import { Entrepreneur } from '../types';

vi.mock('firebase/database', () => ({
    set: vi.fn(),
    ref: vi.fn(),
    onValue: vi.fn(),
    remove: vi.fn(),
    update: vi.fn(),
}));

vi.mock('./firebaseService', () => ({
    db: {},
}));

describe('storageService', () => {
    describe('writeEntrepreneur', () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        it('should call set with the correct ref and remove undefined properties', async () => {
            const mockRef = {};
            (ref as any).mockReturnValue(mockRef);

            const entrepreneur: any = {
                id: '123',
                name: 'John Doe',
                email: 'john@example.com',
                phone: undefined, // This should be removed
                role: 'owner',
                createdAt: new Date('2023-01-01T00:00:00Z'),
            };

            await writeEntrepreneur(entrepreneur as Entrepreneur);

            expect(ref).toHaveBeenCalledWith(db, 'entrepreneurs/123');

            // Check that set was called with the object minus the undefined property
            expect(set).toHaveBeenCalledWith(mockRef, {
                id: '123',
                name: 'John Doe',
                email: 'john@example.com',
                role: 'owner',
                createdAt: new Date('2023-01-01T00:00:00Z'),
            });

            // Explicitly check that phone is not in the object passed to set
            const callArgs = (set as any).mock.calls[0][1];
            expect(callArgs).not.toHaveProperty('phone');
        });

        it('should recursively remove undefined properties', async () => {
             const mockRef = {};
            (ref as any).mockReturnValue(mockRef);

            const entrepreneur: any = {
                id: '456',
                name: 'Jane Doe',
                nested: {
                    valid: true,
                    invalid: undefined,
                    deepNested: {
                        deepValid: 'test',
                        deepInvalid: undefined,
                    }
                }
            };

            await writeEntrepreneur(entrepreneur);

            expect(ref).toHaveBeenCalledWith(db, 'entrepreneurs/456');

            expect(set).toHaveBeenCalledWith(mockRef, {
                id: '456',
                name: 'Jane Doe',
                nested: {
                    valid: true,
                    deepNested: {
                        deepValid: 'test'
                    }
                }
            });
        });
    });
});
