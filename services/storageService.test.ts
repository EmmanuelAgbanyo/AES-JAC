import { describe, it, expect, vi, beforeEach } from 'vitest';
import { set, ref } from 'firebase/database';
import { overwriteEntrepreneurs } from './storageService';
import { db } from './firebaseService';
import type { Entrepreneur } from '../types';

// Mock the firebase/database module
vi.mock('firebase/database', () => {
    return {
        ref: vi.fn((dbInstance, path) => ({ dbInstance, path })),
        set: vi.fn().mockResolvedValue(undefined),
        onValue: vi.fn(),
        remove: vi.fn(),
        update: vi.fn(),
    };
});

// Mock the firebaseService module
vi.mock('./firebaseService', () => {
    return {
        db: { _isMockDb: true }, // dummy object for db
    };
});

describe('storageService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('overwriteEntrepreneurs', () => {
        it('should correctly convert an array of entrepreneurs to an object and call set', async () => {
            const entrepreneurs = [
                { id: '1', name: 'Alice' },
                { id: '2', name: 'Bob' },
            ] as Entrepreneur[];

            await overwriteEntrepreneurs(entrepreneurs);

            // entrepreneursRef is evaluated on module load, before tests run,
            // so we don't need to re-verify ref() was called during `overwriteEntrepreneurs`.
            // Instead, we just need to verify that set() was called with the correct object.

            // set should have been called with the ref and the object map
            expect(set).toHaveBeenCalledWith(expect.anything(), {
                '1': { id: '1', name: 'Alice' },
                '2': { id: '2', name: 'Bob' },
            });
        });

        it('should handle an empty array and pass an empty object to set', async () => {
            await overwriteEntrepreneurs([]);

            expect(set).toHaveBeenCalledWith(expect.anything(), {});
        });

        it('should filter out items without an id property when converting to an object', async () => {
            const mixedEntrepreneurs = [
                { id: '1', name: 'Alice' },
                { name: 'No ID' }, // Missing id
                { id: '3', name: 'Charlie' },
                null,
                undefined,
            ] as any[]; // Use any to force invalid data types

            await overwriteEntrepreneurs(mixedEntrepreneurs);

            expect(set).toHaveBeenCalledWith(expect.anything(), {
                '1': { id: '1', name: 'Alice' },
                '3': { id: '3', name: 'Charlie' },
            });
        });
    });
});
