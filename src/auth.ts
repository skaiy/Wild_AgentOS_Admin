/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** 简单本地登录凭据（演示用，非安全鉴权）。 */
export const AUTH_STORAGE_KEY = 'waos_auth';
export const AUTH_USER = 'admin';
export const AUTH_PASS = 'admin123';

export function isAuthenticated(): boolean {
  return localStorage.getItem(AUTH_STORAGE_KEY) === '1';
}

export function logout(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}
