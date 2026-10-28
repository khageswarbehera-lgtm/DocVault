export const formatBytes = (bytes) => {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index > 1 ? 1 : 0)} ${units[index]}`
}

export const formatPercentage = (value) => `${Number(value || 0).toFixed(value >= 10 ? 0 : 1)}%`

export const formatCount = (count, singular, plural = `${singular}s`) => {
  const total = Number(count) || 0
  return `${total} ${total === 1 ? singular : plural}`
}
