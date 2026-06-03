const { describe, it, expect } = require('@jest/globals');
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('Security Hardening', () => {
  describe('validateId', () => {
    const { validateId } = require('../utils/validate');

    it('should accept valid Graph API IDs', () => {
      expect(validateId('abc-123_XY')).toBe('abc-123_XY');
      expect(validateId('AAMkADI2')).toBe('AAMkADI2');
      expect(validateId('file-id-with-hyphens')).toBe('file-id-with-hyphens');
    });

    it('should reject path traversal patterns', () => {
      expect(() => validateId('../etc/passwd')).toThrow('disallowed characters');
      expect(() => validateId('..\\windows')).toThrow('disallowed characters');
    });

    it('should reject slashes', () => {
      expect(() => validateId('a/b')).toThrow('disallowed characters');
      expect(() => validateId('a\\b')).toThrow('disallowed characters');
    });

    it('should reject null/undefined/non-string', () => {
      expect(() => validateId(null)).toThrow('Missing or invalid');
      expect(() => validateId(undefined)).toThrow('Missing or invalid');
      expect(() => validateId(123)).toThrow('Missing or invalid');
      expect(() => validateId('')).toThrow('Missing or invalid');
    });

    it('should include param name in error message', () => {
      expect(() => validateId('../x', 'fileId')).toThrow('Invalid fileId');
      expect(() => validateId(null, 'driveId')).toThrow('Missing or invalid driveId');
    });
  });

  describe('mailbox validation in config', () => {
    const config = require('../config');

    it('should return "me" for null/undefined/me mailbox', () => {
      expect(config.getMailboxPrefix(null)).toBe('me');
      expect(config.getMailboxPrefix(undefined)).toBe('me');
      expect(config.getMailboxPrefix('me')).toBe('me');
    });

    it('should return users/ prefix for valid mailbox', () => {
      expect(config.getMailboxPrefix('hersh@purposeenergy.com')).toBe('users/hersh@purposeenergy.com');
    });

    it('should reject mailbox with path traversal chars', () => {
      expect(() => config.getMailboxPrefix('../admin')).toThrow('disallowed characters');
      expect(() => config.getMailboxPrefix('user/../../etc')).toThrow('disallowed characters');
    });
  });

  describe('gitignore covers secrets', () => {
    it('should have .env in gitignore', () => {
      const gitignore = fs.readFileSync(path.join(__dirname, '..', '.gitignore'), 'utf8');
      expect(gitignore).toContain('.env');
    });

    it('should have .mcp.json in gitignore', () => {
      const gitignore = fs.readFileSync(path.join(__dirname, '..', '.gitignore'), 'utf8');
      expect(gitignore).toContain('.mcp.json');
    });

    it('should have token files in gitignore', () => {
      const gitignore = fs.readFileSync(path.join(__dirname, '..', '.gitignore'), 'utf8');
      expect(gitignore).toContain('.office-mcp-tokens.json');
    });
  });
});
