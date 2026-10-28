const palette = ['#4f8b63', '#7fa98c', '#c2a05b', '#5f87a6', '#8d84b8', '#a4574f', '#9aa29c']

const readableLabel = (extension) => !extension || extension === 'other'
  ? 'Other'
  : `.${extension}`.toUpperCase()

// Turns the backend file-type buckets into chart/legend data, folding the
// smallest buckets into a single "Other" slice so the legend stays readable.
export const buildStorageSeries = (fileTypes = [], maxSlices = 6) => {
  const slices = fileTypes
    .map((fileType) => ({
      key: fileType.extension || 'other',
      label: readableLabel(fileType.extension),
      bytes: Number(fileType.bytes) || 0,
      count: Number(fileType.count) || 0,
    }))
    .sort((a, b) => b.bytes - a.bytes)

  const head = slices.slice(0, maxSlices)
  const tail = slices.slice(maxSlices)
  if (tail.length) {
    head.push({
      key: 'other-group',
      label: 'More',
      bytes: tail.reduce((total, slice) => total + slice.bytes, 0),
      count: tail.reduce((total, slice) => total + slice.count, 0),
    })
  }

  const totalBytes = slices.reduce((total, slice) => total + slice.bytes, 0)
  return head.map((slice, index) => ({
    ...slice,
    color: palette[index % palette.length],
    percentage: totalBytes > 0 ? Number(((slice.bytes / totalBytes) * 100).toFixed(1)) : 0,
  }))
}
