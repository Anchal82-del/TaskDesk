import { describe, it, expect } from 'vitest';
import { getAvatarInitials } from './avatar-initials';

describe('getAvatarInitials', () => {
  it('returns single letter for users with only one name', () => {
    expect(getAvatarInitials('Anchal')).toBe('A');
    expect(getAvatarInitials('anchal')).toBe('A');
    expect(getAvatarInitials('  Anchal  ')).toBe('A');
  });

  it('returns two initials for users with first and last name', () => {
    expect(getAvatarInitials('Vivek Kumar')).toBe('VK');
    expect(getAvatarInitials('Jyoti Singh')).toBe('JS');
    expect(getAvatarInitials('Nikitha Amaresh')).toBe('NA');
  });

  it('returns first and last initial for multi-word names with extra middle names', () => {
    expect(getAvatarInitials('Vivek Middle Kumar')).toBe('VK');
    expect(getAvatarInitials('  Jyoti   Prasad   Singh  ')).toBe('JS');
  });

  it('handles empty, null, undefined, or whitespace-only safely with fallback U', () => {
    expect(getAvatarInitials(null)).toBe('U');
    expect(getAvatarInitials(undefined)).toBe('U');
    expect(getAvatarInitials('')).toBe('U');
    expect(getAvatarInitials('   ')).toBe('U');
  });
});
