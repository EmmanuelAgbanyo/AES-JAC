import { describe, it, expect } from 'vitest';
import { removeUndefinedProperties } from './storageService';

describe('removeUndefinedProperties', () => {
    it('should return an empty object when passed an empty object', () => {
        expect(removeUndefinedProperties({})).toEqual({});
    });

    it('should return the same object when there are no undefined properties', () => {
        const obj = { a: 1, b: 'two', c: true };
        expect(removeUndefinedProperties(obj)).toEqual(obj);
    });

    it('should remove top-level undefined properties', () => {
        const obj = { a: 1, b: undefined, c: 'three' };
        expect(removeUndefinedProperties(obj)).toEqual({ a: 1, c: 'three' });
    });

    it('should recursively remove nested undefined properties', () => {
        const obj = {
            a: 1,
            nested: {
                b: undefined,
                c: 2,
                deeplyNested: {
                    d: undefined,
                    e: 'five'
                }
            }
        };
        const expected = {
            a: 1,
            nested: {
                c: 2,
                deeplyNested: {
                    e: 'five'
                }
            }
        };
        expect(removeUndefinedProperties(obj)).toEqual(expected);
    });

    it('should preserve arrays, nulls, and Date objects', () => {
        const date = new Date('2023-01-01T00:00:00Z');
        const obj = {
            a: [1, 2, undefined, 4], // It does not touch arrays
            b: null,
            c: date,
            d: undefined
        };
        const expected = {
            a: [1, 2, undefined, 4],
            b: null,
            c: date
        };
        expect(removeUndefinedProperties(obj)).toEqual(expected);
    });

    it('should return an empty object if all keys are undefined', () => {
        const obj = { a: undefined, b: undefined, nested: { c: undefined } };
        expect(removeUndefinedProperties(obj)).toEqual({ nested: {} });
    });
});
