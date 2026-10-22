import { describe, expect, it } from 'vitest';
import { googleAuthErrorMessage } from './authErrors';

describe('googleAuthErrorMessage', () => {
  it('explains embedded-browser popup failures', () => {
    expect(googleAuthErrorMessage({ code: 'auth/popup-blocked' })).toContain('Safari or Chrome');
  });

  it('identifies Firebase provider configuration errors', () => {
    expect(googleAuthErrorMessage({ code: 'auth/operation-not-allowed' })).toContain('enabled in Firebase');
  });

  it('does not expose raw provider errors', () => {
    expect(googleAuthErrorMessage(new Error('sensitive provider detail'))).toBe('Google sign-in could not finish. If you are in an in-app browser, open CozyPod in Safari or Chrome.');
  });
});
