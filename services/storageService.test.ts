import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteEntrepreneur } from './storageService';
import { ref, remove } from 'firebase/database';
import { db } from './firebaseService';

// Mock firebase/database functions
vi.mock('firebase/database', () => ({
  ref: vi.fn(),
  remove: vi.fn(),
  onValue: vi.fn(),
  set: vi.fn(),
  update: vi.fn(),
}));

// Mock firebaseService
vi.mock('./firebaseService', () => ({
  db: {},
}));

describe('storageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('deleteEntrepreneur', () => {
    it('should call ref and remove with correct arguments', async () => {
      const mockId = 'test-id-123';
      const mockRef = { _isMockRef: true };

      // Setup mocks
      vi.mocked(ref).mockReturnValue(mockRef as any);
      vi.mocked(remove).mockResolvedValue(undefined);

      // Call the function
      await deleteEntrepreneur(mockId);

      // Verify ref was called with db and the correct path
      expect(ref).toHaveBeenCalledWith(db, `entrepreneurs/${mockId}`);

      // Verify remove was called with the result of ref
      expect(remove).toHaveBeenCalledWith(mockRef);
    });
  });
});
