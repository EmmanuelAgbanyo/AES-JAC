import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listenToUsers } from '../storageService';
import { onValue } from 'firebase/database';

vi.mock('firebase/database', async () => {
    return {
        ref: vi.fn(),
        onValue: vi.fn(),
        set: vi.fn(),
        remove: vi.fn(),
        update: vi.fn(),
    };
});

vi.mock('../firebaseService', () => {
    return {
        db: {},
    };
});

describe('listenToUsers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should pass array of users when data exists as an object', () => {
        const mockData = {
            'user1': { id: 'user1', name: 'Alice' },
            'user2': { id: 'user2', name: 'Bob' },
        };
        const snapshot = { val: () => mockData };

        // Mock onValue to immediately call the callback with the snapshot
        vi.mocked(onValue).mockImplementation((ref, callback: any) => {
            callback(snapshot);
            return vi.fn(); // return an unsubscribe function mock
        });

        const callback = vi.fn();
        const unsubscribe = listenToUsers(callback);

        expect(onValue).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith([
            { id: 'user1', name: 'Alice' },
            { id: 'user2', name: 'Bob' }
        ]);
        expect(typeof unsubscribe).toBe('function');
    });

    it('should pass filtered array of users when data exists as an array', () => {
        const mockData = [
            null, // some empty slots in arrays
            { id: 'user1', name: 'Alice' },
            undefined,
            { id: 'user2', name: 'Bob' }
        ];
        const snapshot = { val: () => mockData };

        vi.mocked(onValue).mockImplementation((ref, callback: any) => {
            callback(snapshot);
            return vi.fn();
        });

        const callback = vi.fn();
        listenToUsers(callback);

        expect(callback).toHaveBeenCalledWith([
            { id: 'user1', name: 'Alice' },
            { id: 'user2', name: 'Bob' }
        ]);
    });

    it('should pass empty array when data is null', () => {
        const snapshot = { val: () => null };

        vi.mocked(onValue).mockImplementation((ref, callback: any) => {
            callback(snapshot);
            return vi.fn();
        });

        const callback = vi.fn();
        listenToUsers(callback);

        expect(callback).toHaveBeenCalledWith([]);
    });
});
