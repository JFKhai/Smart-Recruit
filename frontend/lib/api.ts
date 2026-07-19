import { getStoredUser } from '@/lib/auth-storage'

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
  // token KHÔNG còn trong response — server gửi qua HTTPOnly Cookie
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit & { skipAuth?: boolean } = {},
): Promise<T> {
  const { skipAuth: _skipAuth, headers, ...rest } = options
  const h = new Headers(headers)
  h.set('Content-Type', 'application/json')

  // ✅ P0: Dùng credentials: 'include' để trình duyệt tự gửi HTTPOnly Cookie kèm mọi request
  // KHÔNG đọc token từ localStorage nữa
  const base = getApiBase()
  const url = path.startsWith('http')
    ? path
    : `${base}${path.startsWith('/') ? path : `/${path}`}`

  const res = await fetch(url, {
    ...rest,
    headers: h,
    credentials: 'include', // ← Quan trọng: gửi cookie theo mỗi request
  })
  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }

  if (!res.ok) {
    // ✅ Xử lý 401: Nếu session hết hạn, dọn user metadata và redirect về login
    if (res.status === 401 && typeof window !== 'undefined') {
      const { clearAuth } = await import('@/lib/auth-storage')
      clearAuth()
      // Tránh redirect loop nếu đang ở trang login
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }

    let msg = res.statusText
    if (typeof data === 'object' && data !== null && 'message' in data) {
      const m = (data as { message: unknown }).message
      if (Array.isArray(m)) {
        msg = m.map(String).join(', ')
      } else if (typeof m === 'string') {
        msg = m
      } else if (m != null) {
        msg = String(m)
      }
    }
    throw new ApiError(msg, res.status, data)
  }

  return data as T
}

// Helper để gọi logout API và xóa session
export async function apiLogout(): Promise<void> {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' })
  } catch {
    // ignore errors during logout
  } finally {
    const { clearAuth } = await import('@/lib/auth-storage')
    clearAuth()
  }
}
