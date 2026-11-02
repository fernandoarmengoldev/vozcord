import { getToken } from './auth';
import { API_URL } from './config';

export type ApiOptions = RequestInit & { auth?: boolean };

const BASE_URL = API_URL;

export async function apiFetch(path: string, options: ApiOptions = {}) {
  const { auth, headers, body, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    ...(headers as Record<string, string> | undefined),
  };

  // Only set Content-Type for non-FormData requests
  // FormData will set its own Content-Type with boundary
  if (!(body instanceof FormData)) {
    finalHeaders['Content-Type'] = 'application/json';
  }

  if (auth) {
    const token = await getToken();
    if (token) finalHeaders['Authorization'] = `Bearer ${token}`;
  }

  const fullUrl = `${BASE_URL}${path}`;


  return fetch(fullUrl, {
    ...rest,
    body,
    headers: finalHeaders,
  });
}
