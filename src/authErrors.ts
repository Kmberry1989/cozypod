const embeddedBrowserCodes = new Set([
  'auth/operation-not-supported-in-this-environment',
  'auth/popup-blocked',
  'auth/web-storage-unsupported',
]);

export function googleAuthErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  if (embeddedBrowserCodes.has(code)) return 'Google sign-in is blocked here. Open CozyPod in Safari or Chrome and try again.';
  if (code === 'auth/popup-closed-by-user') return 'Google sign-in was closed before it finished.';
  if (code === 'auth/cancelled-popup-request') return 'A Google sign-in window is already open.';
  if (code === 'auth/unauthorized-domain') return 'This CozyPod address is not approved for Google sign-in yet.';
  if (code === 'auth/operation-not-allowed') return 'Google sign-in needs to be enabled in Firebase Authentication.';
  if (code === 'auth/network-request-failed') return 'Google sign-in could not reach the network. Check your connection and try again.';
  return 'Google sign-in could not finish. If you are in an in-app browser, open CozyPod in Safari or Chrome.';
}
