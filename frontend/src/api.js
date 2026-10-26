const TOKEN_KEY = 'et_token'

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch { /* storage unavailable (private mode) */ }
}

export async function api(path, { method = 'GET', body } = {}) {
  const token = getToken()
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 401 && path !== '/auth/login') {
    setToken(null)
    window.dispatchEvent(new Event('auth:logout'))
  }
  if (!res.ok) {
    let msg = res.statusText || 'Request failed'
    try {
      const data = await res.json()
      msg = typeof data.detail === 'string' ? data.detail : data.detail?.[0]?.msg || msg
    } catch { /* not JSON */ }
    throw new Error(msg)
  }
  return res.status === 204 ? null : res.json()
}
