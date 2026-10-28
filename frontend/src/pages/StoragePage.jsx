import { ArrowRight, ArrowUpRight, FileType, HardDrive, Info, LayoutGrid, RefreshCw, TriangleAlert, UploadCloud } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button, EmptyState } from '../components/common/UI'
import StorageDonut from '../components/storage/StorageChart'
import { useStorageStats } from '../hooks/useStorageStats'
import { formatBytes, formatCount } from '../utils/format'
import { buildStorageSeries } from '../utils/storageSeries'

const LoadingNote = ({ label }) => <div className="inline-loading"><span />{label}</div>

export default function StoragePage() {
  const { stats, isLoading, error, refresh } = useStorageStats()
  const used = Number(stats?.storageUsed) || 0
  const limit = Number(stats?.storageLimit) || 0
  const free = Math.max(0, limit - used)
  const usedPercentage = limit > 0 ? Math.min(100, Number(((used / limit) * 100).toFixed(1))) : 0
  const series = buildStorageSeries(stats?.fileTypes)
  const largest = series[0]
  const trashedBytes = Number(stats?.trashedBytes) || 0
  const almostFull = limit > 0 && usedPercentage >= 90
  const waiting = isLoading && !stats
  const value = (formatted) => stats ? formatted : '—'
  const note = stats
    ? almostFull
      ? { title: 'Running low on room', body: trashedBytes > 0 ? `You have ${formatBytes(free)} left. Emptying the trash would release ${formatBytes(trashedBytes)} right away.` : `You have ${formatBytes(free)} left. Remove files you no longer need to make room.` }
      : trashedBytes > 0
        ? { title: 'Trash is still taking space', body: `${formatBytes(trashedBytes)} is held by ${formatCount(stats.trashedDocuments, 'deleted file')}. Delete them permanently to free that space.` }
        : { title: 'You have room to spare', body: `Everything is comfortably within your ${formatBytes(limit)} allowance, and your trash is empty.` }
    : error
      ? { title: 'Usage could not be measured', body: `${error} Try refreshing — the numbers are recalculated from your documents.` }
      : { title: 'Measuring your vault', body: 'Adding up the size of every document you own.' }

  return <section className="storage-page"><div className="page-heading"><div><span className="eyebrow">A LITTLE ROOM TO GROW</span><h1>Your storage</h1><p>{error ? 'We could not refresh your usage just now.' : stats ? `${formatBytes(used)} of ${formatBytes(limit)} used, including anything waiting in Trash.` : 'Measuring everything you’ve saved…'}</p></div><div className="page-heading-actions"><Button variant="secondary" onClick={() => refresh()} disabled={isLoading}><RefreshCw size={16} /> Refresh</Button><Button onClick={() => window.location.assign('/documents?upload=1')}><UploadCloud size={16} /> Add documents</Button></div></div>
    <div className="stats-grid" aria-label="Storage summary"><article className="stat-card stat-primary"><span className="stat-icon"><HardDrive size={18} /></span><span className="stat-label">Storage used</span><strong>{waiting ? '…' : value(formatBytes(used))}</strong><small>{stats ? `${usedPercentage}% of ${formatBytes(limit)}` : error ? 'Unavailable right now' : 'Measuring…'}</small><span className="stat-decoration">S</span></article><article className="stat-card"><span className="stat-icon stat-icon-blue"><LayoutGrid size={18} /></span><span className="stat-label">Active files</span><strong>{waiting ? '…' : value(stats.activeDocuments)}</strong><small>{stats ? `${formatBytes(stats.activeBytes)} stored` : error ? 'Unavailable right now' : 'Measuring…'}</small></article><article className="stat-card"><span className="stat-icon stat-icon-amber"><TriangleAlert size={18} /></span><span className="stat-label">In Trash</span><strong>{waiting ? '…' : value(stats.trashedDocuments)}</strong><small>{stats ? `${formatBytes(trashedBytes)} still counted` : error ? 'Unavailable right now' : 'Measuring…'}</small><Link className="stat-arrow" to="/trash" aria-label="Open trash"><ArrowUpRight size={17} /></Link></article><article className="stat-card"><span className="stat-icon"><FileType size={18} /></span><span className="stat-label">File types</span><strong>{waiting ? '…' : value(series.filter((slice) => slice.key !== 'other-group').length)}</strong><small>{stats ? (largest ? `Largest: ${largest.label}` : 'No documents yet') : error ? 'Unavailable right now' : 'Measuring…'}</small></article></div>
    <div className="storage-overview">
      <div className="storage-usage-panel"><div className="storage-usage-top"><span className="storage-large-icon"><HardDrive size={20} /></span><span className="eyebrow">PERSONAL PLAN</span></div><div className="storage-total"><strong>{waiting ? '…' : value(formatBytes(used))}</strong><span>of {limit ? formatBytes(limit) : '—'} allowance</span></div><div className="storage-large-progress" role="progressbar" aria-valuenow={usedPercentage} aria-valuemin={0} aria-valuemax={100} aria-label="Storage used"><span style={{ width: `${stats ? usedPercentage : 0}%` }} /></div><div className="storage-usage-foot"><span><b>{stats ? formatBytes(free) : '—'}</b> free</span><span>{stats ? formatCount(stats.totalDocuments, 'document') : '—'}</span></div><div className="storage-plan-note"><Info size={15} /><span>Files in Trash keep counting against your allowance until they are deleted permanently.</span></div></div>
      <div className="storage-chart-panel"><div className="section-heading"><div><span className="eyebrow">WHAT’S TAKING SPACE</span><h2>By file type</h2></div>{stats && <Link className="small-icon-link" to="/documents" aria-label="Browse documents"><ArrowUpRight size={17} /></Link>}</div>{waiting ? <LoadingNote label="Adding up your file sizes…" /> : error ? <EmptyState icon={TriangleAlert} title="Could not load usage" description={error} action={<Button variant="secondary" onClick={() => refresh()}><RefreshCw size={15} /> Try again</Button>} /> : series.length ? <div className="storage-chart-layout"><div className="storage-donut"><StorageDonut data={series} ariaLabel="Storage used by file type" /><span><b>{usedPercentage}%</b><small>of allowance</small></span></div><div className="storage-legend">{series.map((slice) => <div key={slice.key}><span><i style={{ background: slice.color }} />{slice.label}</span><b>{formatBytes(slice.bytes)}</b><small>{formatCount(slice.count, 'file')} · {slice.percentage}%</small></div>)}</div></div> : <EmptyState icon={HardDrive} title="Nothing stored yet" description="Upload your first document and its size will show up here." action={<Button onClick={() => window.location.assign('/documents?upload=1')}><UploadCloud size={15} /> Add a document</Button>} />}</div></div>
    <div className="storage-advice"><div className="advice-mark">{almostFull || error ? <TriangleAlert size={18} /> : <Info size={18} />}</div><div><b>{note.title}</b><p>{note.body}</p></div>{trashedBytes > 0 ? <Link to="/trash">Review trash <ArrowRight size={15} /></Link> : <Link to="/documents">Browse documents <ArrowRight size={15} /></Link>}</div></section>

}
