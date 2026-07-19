const USER_KEY = 'smart_recruit_user'

export type StoredUser = {
  id: string
  email: string
  role: 'candidate' | 'employer' | 'admin'
}

// ✅ P0: Lưu thông tin User để hiển thị UI (id, email, role)
// Token KHÔNG lưu ở đây nữa — token nằm trong HTTPOnly Cookie do Backend set
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

// Giữ lại để không phải sửa nhiều nơi đang import nhưng KHÔNG trả về JWT nữa
// Dùng /api/auth/me để kiểm tra session thật
export function getToken(): string | null {
  return null
}
