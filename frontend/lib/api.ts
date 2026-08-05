/**
 * API client — Smart Recruit
 *
 * Auth: HTTPOnly cookie `token` + credentials: 'include'.
 * CẤM lưu JWT trong localStorage. Session thật = GET /api/auth/me.
 * localStorage chỉ được chứa user summary (id, email, role) cho UI.
 */

const DEFAULT_API = 'http://localhost:5000'

export function getApiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL || DEFAULT_API
}

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(message: string, status: number, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export type AuthResponse = {
  _id: string
  email: string
  role: 'candidate' | 'employer' | 'admin'
}

function buildUrl(path: string): string {
  if (path.startsWith('http')) return path
  const base = getApiBase()
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

function messageFromBody(data: unknown, fallback: string): string {
  if (typeof data === 'object' && data !== null && 'message' in data) {
    const m = (data as { message: unknown }).message
    if (Array.isArray(m)) return m.map(String).join(', ')
    if (typeof m === 'string') return m
    if (m != null) return String(m)
  }
  return fallback
}

export type ApiFetchOptions = RequestInit & {
  /** Giữ để tương thích call site cũ — không còn đọc token */
  skipAuth?: boolean
}

/**
 * Fetch JSON tới backend với cookie session.
 * Không set Authorization Bearer. Không đọc JWT từ storage.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { skipAuth: _skipAuth, headers, body, ...rest } = options
  const h = new Headers(headers)

  const isFormData =
    typeof FormData !== 'undefined' && body instanceof FormData
  if (!isFormData && body != null && !h.has('Content-Type')) {
    h.set('Content-Type', 'application/json')
  }

  const res = await fetch(buildUrl(path), {
    ...rest,
    body,
    headers: h,
    credentials: 'include',
  })

  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }

  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined') {
      const { clearAuth } = await import('@/lib/auth-storage')
      clearAuth()
      if (!window.location.pathname.startsWith('/login')) {
        const redirect = encodeURIComponent(
          `${window.location.pathname}${window.location.search}`,
        )
        window.location.href = `/login?redirect=${redirect}`
      }
    }

    throw new ApiError(
      messageFromBody(data, res.statusText || 'Request failed'),
      res.status,
      data,
    )
  }

  return data as T
}

/** Session hiện tại — nguồn chân lý auth (không dùng localStorage làm quyền). */
export async function apiMe(): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/me')
}

export async function apiLogout(): Promise<void> {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' })
  } catch {
    // ignore
  } finally {
    const { clearAuth } = await import('@/lib/auth-storage')
    clearAuth()
  }
}
