import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, FileText, FolderClosed, HardDrive, Heart, Info, MoreHorizontal, Plus, Share2, UploadCloud } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import { useAuth } from '../context/useAuth'
import { useDocuments } from '../context/useDocuments'
import { getSharedWithMe } from '../services/shareService'
import StorageDonut from '../components/storage/StorageChart'
import { useStorageStats } from '../hooks/useStorageStats'
import { formatBytes } from '../utils/format'
import { buildStorageSeries } from '../utils/storageSeries'
import { Button, DocumentMeta, FileIcon, Modal } from '../components/common/UI'

const formatDate = (date) => formatDistanceToNow(new Date(date), { addSuffix: true })
const today = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
}).toUpperCase()

export default function Dashboard() {
  const { user } = useAuth()
  const { documents, folders, createFolder, loadDocumentsForView, isLoading } = useDocuments()
  const [folderOpen, setFolderOpen] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [recent, setRecent] = useState([])
  const [sharedCount, setSharedCount] = useState(null)
  const { stats: storage, isLoading: storageLoading, error: storageError } = useStorageStats()
  const navigate = useNavigate()
  const liveDocs = documents.filter((document) => !document.isDeleted)
  const storageWaiting = storageLoading && !storage
  const storageUsed = Number(storage?.storageUsed) || 0
  const storageLimit = Number(storage?.storageLimit) || 0
  const usedPercentage = storageLimit > 0 ? Math.min(100, Number(((storageUsed / storageLimit) * 100).toFixed(1))) : 0
  const storageSeries = buildStorageSeries(storage?.fileTypes, 4)
  useEffect(() => {
    let active = true
    if (isLoading) return () => { active = false }
    loadDocumentsForView('recent')
      .then((items) => { if (active) setRecent(items.slice(0, 5)) })
      .catch(() => { if (active) { setRecent([]); toast.error('Could not load recent documents.') } })
    getSharedWithMe()
      .then((items) => { if (active) setSharedCount(items.length) })
      .catch(() => { if (active) setSharedCount(null) })
    return () => { active = false }
  }, [isLoading, loadDocumentsForView])

  const handleCreateFolder = async (event) => {
    event.preventDefault()
    if (!folderName.trim()) return
    try {
      await createFolder(folderName.trim())
      setFolderName('')
      setFolderOpen(false)
      toast.success('Folder created successfully')
    } catch {
      toast.error('Could not create the folder. Please try again.')
    }
  }

  return <div className="dashboard-page">
    <section className="welcome-panel"><div><span className="eyebrow">{today}</span><h1>Good morning, {user?.name?.split(' ')[0] || 'there'}<span className="greeting-mark">.</span></h1><p>Here’s a little look at what’s in your corner of the world.</p></div><div className="welcome-actions"><Button onClick={() => navigate('/documents?upload=1')}><UploadCloud size={16} /> Upload document</Button><Button variant="secondary" onClick={() => setFolderOpen(true)}><Plus size={16} /> New folder</Button></div></section>
    <section className="stats-grid" aria-label="Vault summary"><article className="stat-card stat-primary"><span className="stat-icon"><FileText size={18} /></span><span className="stat-label">Documents</span><strong>{liveDocs.length}</strong><small>Across {folders.length} {folders.length === 1 ? 'folder' : 'folders'}</small><span className="stat-decoration">D</span></article><article className="stat-card"><span className="stat-icon stat-icon-amber"><HardDrive size={18} /></span><span className="stat-label">Storage used</span><strong>{storageWaiting ? '…' : storage ? formatBytes(storageUsed) : '—'}</strong><small>{storage ? `${usedPercentage}% of ${formatBytes(storageLimit)} allowance` : storageError ? 'Usage unavailable right now' : 'Measuring your vault…'}</small><Link className="stat-arrow" to="/storage" aria-label="Open storage"><ArrowUpRight size={17} /></Link></article><article className="stat-card"><span className="stat-icon stat-icon-rose"><Heart size={18} /></span><span className="stat-label">Favorites</span><strong>{storage ? storage.favoriteDocuments : liveDocs.filter((document) => document.isFavorite).length}</strong><small>Your most reached-for files</small><Link className="stat-arrow" to="/favorites"><ArrowUpRight size={17} /></Link></article><article className="stat-card"><span className="stat-icon stat-icon-blue"><Share2 size={18} /></span><span className="stat-label">Shared with you</span><strong>{sharedCount === null ? '—' : sharedCount}</strong><small>{sharedCount === null ? 'Could not load shared files' : 'Shared directly with you'}</small><Link className="stat-arrow" to="/shared"><ArrowUpRight size={17} /></Link></article></section>
    <div className="dashboard-columns"><div className="dashboard-main-column"><section className="content-section recent-section"><div className="section-heading"><div><span className="eyebrow">PICK UP WHERE YOU LEFT OFF</span><h2>Recently updated</h2></div><Link className="view-all-link" to="/recent">View all <ArrowRight size={15} /></Link></div><div className="recent-list">{recent.map((document) => <Link className="recent-row" to={`/documents/${document.id}`} key={document.id}><FileIcon type={document.fileType} /><span className="recent-name"><b>{document.name}</b><DocumentMeta document={document} /></span><span className="recent-folder">{document.folder}</span><span className="recent-date">{formatDate(document.updatedAt)}</span><button className="row-more" aria-label={`Open ${document.name}`} onClick={(event) => { event.preventDefault(); navigate(`/documents/${document.id}`); }}><MoreHorizontal size={18} /></button></Link>)}</div></section>
      <section className="content-section folders-section"><div className="section-heading"><div><span className="eyebrow">A PLACE FOR EVERYTHING</span><h2>Your folders</h2></div><Link className="view-all-link" to="/folders">All folders <ArrowRight size={15} /></Link></div><div className="folder-grid">{folders.slice(0, 4).map((folder, index) => <Link className={`folder-tile folder-color-${index % 4}`} to={`/folders/${folder.id}`} key={folder.id}><span className="folder-tile-icon"><FolderClosed size={20} /></span><span className="folder-tile-more"><MoreHorizontal size={17} /></span><b>{folder.name}</b><small>{documents.filter((document) => document.folderId === folder.id).length} documents</small><span className="folder-tile-foot">Updated {formatDate(folder.updatedAt)}</span></Link>)}</div></section></div>
      <aside className="dashboard-side-column"><section className="storage-card"><div className="section-heading"><div><span className="eyebrow">YOUR SPACE</span><h2>Storage</h2></div><Link className="small-icon-link" to="/storage" aria-label="View storage"><ArrowUpRight size={17} /></Link></div><div className="storage-chart-wrap">{storageWaiting ? <div className="inline-loading"><span />Measuring your vault…</div> : storageError ? <div className="storage-plan-note"><Info size={15} /><span>{storageError}</span></div> : storageSeries.length ? <StorageDonut data={storageSeries} ariaLabel="Storage used by file type" /> : <div className="storage-plan-note"><Info size={15} /><span>Nothing stored yet — upload something and this fills in.</span></div>}</div><div className="storage-breakdown"><div><span><i style={{ background: '#57906a' }} />Active documents</span><b>{storage ? storage.activeDocuments : liveDocs.length}</b></div><div><span><i style={{ background: '#c2a05b' }} />In Trash</span><b>{storage ? storage.trashedDocuments : '—'}</b></div><div><span><i style={{ background: '#aeb8ae' }} />Free space</span><b>{storage ? formatBytes(Math.max(0, storageLimit - storageUsed)) : '—'}</b></div></div><Link className="storage-card-link" to="/storage">Manage storage <ArrowRight size={15} /></Link></section>
        <section className="dashboard-note"><div className="note-mark">✳</div><span className="eyebrow">A SMALL REMINDER</span><h3>Important things deserve a little order.</h3><p>You’re doing a lovely job of keeping things together.</p><div className="note-dashes"><i /><i /><i /><i /><i /><i /></div></section></aside></div>
    {folderOpen && <Modal title="Create a folder" eyebrow="A NEW PLACE TO PUT THINGS" onClose={() => setFolderOpen(false)}><form className="modal-form" onSubmit={handleCreateFolder}><label className="field"><span>Folder name</span><input autoFocus value={folderName} onChange={(event) => setFolderName(event.target.value)} placeholder="e.g. Home, Travel, Education" /></label><div className="modal-actions"><Button variant="quiet" type="button" onClick={() => setFolderOpen(false)}>Cancel</Button><Button type="submit">Create folder <ArrowRight size={15} /></Button></div></form></Modal>}
  </div>
}
