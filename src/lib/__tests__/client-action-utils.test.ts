import { describe, it, expect } from 'vitest';
import {
  isServerActionNotFoundError,
  getActionErrorMessage,
  STALE_ACTION_ERROR_MESSAGE,
} from '../client-action-utils';

describe('client-action-utils', () => {
  describe('isServerActionNotFoundError', () => {
    it('detects Next.js UnrecognizedActionError with observed action ID', () => {
      const err = new Error('Server Action "7f03c3fdc95c135d16f0744cfee483f47c116cafd" was not found on the server.');
      expect(isServerActionNotFoundError(err)).toBe(true);
    });

    it('detects Next.js Failed to find Server Action deployment error', () => {
      const err = new Error(
        'Failed to find Server Action "7f9b65c8996ef571edede6a56ddc1bd0ddf0d5d43d". This request might be from an older or newer deployment.'
      );
      expect(isServerActionNotFoundError(err)).toBe(true);
    });

    it('detects Server Reference ID format mismatch error', () => {
      const err = new Error('Server Reference ID did not match the expected format');
      expect(isServerActionNotFoundError(err)).toBe(true);
    });

    it('returns true when error is passed as a string message', () => {
      expect(
        isServerActionNotFoundError('Server Action "abc123" was not found on the server.')
      ).toBe(true);
    });

    it('returns false for standard validation and business errors', () => {
      expect(isServerActionNotFoundError(new Error('Password must be at least 8 characters'))).toBe(false);
      expect(isServerActionNotFoundError(new Error('User not found'))).toBe(false);
      expect(isServerActionNotFoundError(new Error('User with this email already exists'))).toBe(false);
      expect(isServerActionNotFoundError(new Error('Cannot remove the last admin account.'))).toBe(false);
      expect(isServerActionNotFoundError(new Error('Network request failed'))).toBe(false);
    });

    it('returns false for null, undefined, or empty values', () => {
      expect(isServerActionNotFoundError(null)).toBe(false);
      expect(isServerActionNotFoundError(undefined)).toBe(false);
      expect(isServerActionNotFoundError('')).toBe(false);
    });
  });

  describe('getActionErrorMessage', () => {
    it('translates stale Server Action errors into a clear user-facing reload message', () => {
      const err = new Error('Server Action "7f03c3fdc95c135d16f0744cfee483f47c116cafd" was not found on the server.');
      expect(getActionErrorMessage(err, 'Failed to update user')).toBe(STALE_ACTION_ERROR_MESSAGE);
    });

    it('preserves user-facing validation error messages', () => {
      const err = new Error('Password must be at least 8 characters');
      expect(getActionErrorMessage(err, 'Failed to update user')).toBe('Password must be at least 8 characters');
    });

    it('preserves string error inputs', () => {
      expect(getActionErrorMessage('Invalid email address', 'Failed')).toBe('Invalid email address');
    });

    it('falls back to default message when error is empty or undefined', () => {
      expect(getActionErrorMessage(null, 'Failed to update user')).toBe('Failed to update user');
      expect(getActionErrorMessage(undefined, 'Fallback error')).toBe('Fallback error');
      expect(getActionErrorMessage('', 'Fallback error')).toBe('Fallback error');
    });
  });
});
