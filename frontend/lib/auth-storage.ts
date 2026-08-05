const USER_KEY = 'smart_recruit_user'

export type StoredUser = {
  id: string
  email: string
  role: 'candidate' | 'employer' | 'admin'
}

/**
 * Chỉ lưu metadata để hiển thị UI (tên/email/role trên header).
 * JWT KHÔNG được lưu ở đây — nằm HTTPOnly cookie do backend set.
 * Quyền thật luôn lấy từ GET /api/auth/me.
 */
export function setAuth(user: StoredUser) {
  if (typeof window === 'undefined') return
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuth() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(USER_KEY)
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredUser
  } catch {
    return null
  }
}

/** @deprecated Luôn trả null — không còn JWT phía client */
export function getToken(): string | null {
  return null
}
