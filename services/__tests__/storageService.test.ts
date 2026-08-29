import { describe, it, expect } from 'vitest';
import { arrayToObject } from '../storageService';

describe('storageService', () => {
    describe('arrayToObject', () => {
        it('should return an empty object for an empty array', () => {
            const result = arrayToObject([]);
            expect(result).toEqual({});
        });

        it('should correctly convert an array of objects with ids to a record object', () => {
            const input = [
                { id: '1', name: 'Alice' },
                { id: '2', name: 'Bob' }
            ];
            const result = arrayToObject(input);
            expect(result).toEqual({
                '1': { id: '1', name: 'Alice' },
                '2': { id: '2', name: 'Bob' }
            });
        });

        it('should ignore missing, null, or undefined items in the array', () => {
            const input = [
                { id: '1', name: 'Alice' },
                null as any,
                undefined as any,
                { id: '2', name: 'Bob' }
            ];
            const result = arrayToObject(input);
            expect(result).toEqual({
                '1': { id: '1', name: 'Alice' },
                '2': { id: '2', name: 'Bob' }
            });
        });

        it('should ignore items that are missing an id property', () => {
            const input = [
                { id: '1', name: 'Alice' },
                { name: 'NoId' } as any,
                { id: '2', name: 'Bob' }
            ];
            const result = arrayToObject(input);
            expect(result).toEqual({
                '1': { id: '1', name: 'Alice' },
                '2': { id: '2', name: 'Bob' }
            });
        });

        it('should handle duplicate ids by overwriting the previous item with the same id', () => {
            const input = [
                { id: '1', name: 'Alice' },
                { id: '2', name: 'Bob' },
                { id: '1', name: 'Alice Updated' }
            ];
            const result = arrayToObject(input);
            expect(result).toEqual({
                '1': { id: '1', name: 'Alice Updated' },
                '2': { id: '2', name: 'Bob' }
            });
        });
    });
});