/**
 * Translates standard 5-part cron expressions into natural Vietnamese text.
 */
export function translateCronToVietnamese(expression: string): string {
  if (!expression || typeof expression !== 'string') {
    return 'Chưa có biểu thức Cron'
  }

  const parts = expression.trim().split(/\s+/)
  if (parts.length < 5) {
    return 'Biểu thức Cron không hợp lệ (cần ít nhất 5 phần)'
  }

  const [min, hour, dayOfMonth, month, dayOfWeek] = parts

  // Every minute
  if (min === '*' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return '⚠️ Chạy liên tục mỗi phút'
  }

  // Every N minutes e.g. */5, */15
  if (min.startsWith('*/') && hour === '*' && dayOfMonth === '*') {
    const interval = min.replace('*/', '')
    return `⚠️ Chạy ${interval} phút một lần`
  }

  // Hourly
  if ((min === '0' || min === '00') && hour === '*' && dayOfMonth === '*') {
    return 'Chạy vào phút thứ 0 của mỗi giờ (1 tiếng/lần)'
  }

  // Daily specific hours e.g. 0 7,17 * * *
  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    const hoursFormatted = hour
      .split(',')
      .map((h) => `${h.padStart(2, '0')}:00`)
      .join(' và ')
    return `Chạy vào lúc ${hoursFormatted} hàng ngày`
  }

  // Weekly e.g. 0 8 * * 1
  if (dayOfMonth === '*' && month === '*' && dayOfWeek !== '*') {
    const daysMap: Record<string, string> = {
      '0': 'Chủ Nhật',
      '1': 'Thứ Hai',
      '2': 'Thứ Ba',
      '3': 'Thứ Tư',
      '4': 'Thứ Năm',
      '5': 'Thứ Sáu',
      '6': 'Thứ Bảy',
      '7': 'Chủ Nhật',
    }
    const dayName = daysMap[dayOfWeek] || `Ngày thứ ${dayOfWeek}`
    const hourFormatted = hour.padStart(2, '0') + ':00'
    return `Chạy vào ${hourFormatted} ${dayName} hàng tuần`
  }

  return `Lịch trình tùy chỉnh: Phút ${min}, Giờ ${hour}, Ngày ${dayOfMonth}`
}

/**
 * Validates whether a cron expression is too frequent (less than 15 minutes).
 */
export function isTooFrequentCron(expression: string): boolean {
  if (!expression || typeof expression !== 'string') return false
  const parts = expression.trim().split(/\s+/)
  if (parts.length < 5) return false

  const [min, hour] = parts

  // Continuous every minute
  if (min === '*' && hour === '*') return true

  // Step minutes less than 15 (e.g., */1, */2, */5, */10)
  if (min.startsWith('*/') && hour === '*') {
    const step = parseInt(min.replace('*/', ''), 10)
    if (!isNaN(step) && step < 15) {
      return true
    }
  }

  return false
}
