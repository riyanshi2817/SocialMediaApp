const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');

const statusMessages = {
  400: 'Please check the information and try again.',
  401: 'Your session has ended. Please sign in again.',
  403: 'You do not have permission to do that.',
  404: 'We could not find what you requested.',
  409: 'That account already exists.',
  413: 'That request is too large.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'The service is having trouble. Please try again shortly.',
  502: 'An external service is temporarily unavailable. Please try again.'
};

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers: options.body instanceof FormData
        ? options.headers
        : { 'Content-Type': 'application/json', ...options.headers }
    });
  } catch (requestError) {
    if (requestError.name === 'AbortError') {
      throw requestError;
    }
    const error = new Error('Unable to reach the server. Check that the backend is running.');
    error.status = 0;
    throw error;
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    const error = new Error(statusMessages[response.status] || payload.message || 'Something went wrong.');
    error.status = response.status;
    throw error;
  }
  return payload;
}

export const api = {
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),
  summary: () => request('/posts/summary'),
  posts: ({ page = 1, limit = 8, search = '' } = {}, requestOptions = {}) => request(`/posts?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, requestOptions),
  post: (id) => request(`/posts/${id}`),
  createPost: (formData) => request('/posts', { method: 'POST', body: formData }),
  updatePost: (id, data) => request(`/posts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deletePost: (id) => request(`/posts/${id}`, { method: 'DELETE' })
};
