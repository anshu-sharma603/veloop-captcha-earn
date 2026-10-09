import { request } from './api.js';

export const authService = {
  login: (email, password) => request('POST', '/auth/login', { email, password }),
};
export const captchaService = {
  config: () => request('GET', '/captcha/config'),
  current: () => request('GET', '/captcha/current'),
  newCaptcha: () => request('POST', '/captcha/new', {}),
  // Only the challenge id and the chosen option are ever sent. The server decides everything else.
  verify: (challengeId, selectedOption) => request('POST', '/captcha/verify', { challengeId, selectedOption }),
  claim: (challengeId) => request('POST', '/captcha/claim', { challengeId }),
  history: (page = 1, limit = 5) => request('GET', `/captcha/history?page=${page}&limit=${limit}`),
};
export const walletService = {
  gems: () => request('GET', '/wallet/gems'),
};
