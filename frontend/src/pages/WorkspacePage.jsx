import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ChevronDown, FileText, Filter, FolderClosed, Grid2X2, List, Plus, Search, SlidersHorizontal, UploadCloud } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { useDocuments } from '../context/useDocuments'
import { getApiErrorMessage } from '../services/api'
import { Button, EmptyState, FileIcon, Modal } from '../components/common/UI'
import DocumentCard from '../components/documents/DocumentCard'
import DocumentTable from '../components/documents/DocumentTable'
import DocumentPreviewModal from '../components/documents/DocumentPreviewModal'
import UploadModal from '../components/documents/UploadModal'

const pageDetails = {
  documents: { title: 'My documents', eyebrow: 'YOUR PERSONAL LIBRARY', description: 'All the things you’ve tucked away, together in one place.' },
  recent: { title: 'Recently updated', eyebrow: 'PICK UP WHERE YOU LEFT OFF', description: 'Your most recently changed documents.' },
  favorites: { title: 'Favorites', eyebrow: 'CLOSE AT HAND', description: 'The documents you’ve marked as worth keeping near.' },
  trash: { title: 'Trash', eyebrow: 'A SECOND LOOK', description: 'Deleted documents stay here until you restore or remove them for good.' },
  shared: { title: 'Shared with me', eyebrow: 'A LITTLE HELP FROM OTHERS', description: 'Documents other people have made available to you.' },
  folders: { title: 'Your folders', eyebrow: 'A PLACE FOR EVERYTHING', description: 'A little structure makes the important things easier to find.' },
}

function FolderTile({ folder, count, onRename, onDelete }) {
  return <article className="folder-tile folder-tile-large" style={{ '--folder-tint': folder.color || '#dcece4' }}><Link to={`/folders/${folder.id}`} className="folder-open"><span className="folder-tile-icon"><FolderClosed size={22} /></span><span className="folder-tile-more" aria-hidden="true">↗</span><b>{folder.name}</b><small>{count} {count === 1 ? 'document' : 'documents'}</small><span className="folder-tile-foot">Updated {format(new Date(folder.updatedAt), 'MMM d')}</span></Link><details className="folder-options"><summary aria-label={`Folder actions for ${folder.name}`}>•••</summary><div><button onClick={onRename}>Rename folder</button><button className="danger-menu-item" onClick={onDelete}>Delete folder</button></div></details></article>
}

function DocumentDetail({ document, sharedPermission, onDownload, onPreview, onRename, onMove, onDelete, onToggleFavorite }) {
  const isShared = Boolean(sharedPermission)
  return <div className="document-detail-page"><Link className="back-link" to={isShared ? '/shared' : '/documents'}><ArrowLeft size={15} /> {isShared ? 'Shared with me' : 'All documents'}</Link><div className="detail-heading"><div><span className="eyebrow">DOCUMENT DETAILS</span><h1>{document.name}</h1><p>{document.originalName}</p></div><div className="detail-actions"><Button variant="secondary" onClick={onDownload}>Download</Button><Button onClick={onPreview}>Preview document</Button></div></div><div className="detail-content"><div className="detail-preview-block"><div className={`detail-document-art document-art-${document.color || 'blue'}`}><FileIcon type={document.fileType} size={46} /></div><Button variant="secondary" onClick={onPreview}>Open preview <ArrowRight size={15} /></Button></div><div className="detail-information"><h2>About this document</h2><dl><div><dt>File type</dt><dd>{document.fileType}</dd></div><div><dt>File size</dt><dd>{(document.size / (1024 * 1024)).toFixed(2)} MB</dd></div><div><dt>Folder</dt><dd>{document.folder || 'My Documents'}</dd></div><div><dt>Added</dt><dd>{format(new Date(document.createdAt), 'MMMM d, yyyy')}</dd></div><div><dt>Last updated</dt><dd>{format(new Date(document.updatedAt), 'MMMM d, yyyy')}</dd></div>{isShared && <div><dt>Permission</dt><dd>{sharedPermission}</dd></div>}<div><dt>Storage reference</dt><dd className="detail-storage-note">Private cloud storage</dd></div></dl>{!isShared && <div className="detail-management"><button onClick={onRename}>Rename document</button><button onClick={onMove}>Move to folder</button><button onClick={onToggleFavorite}>{document.isFavorite ? 'Remove from favorites' : 'Add to favorites'}</button><button className="danger-text" onClick={onDelete}>Move to trash</button></div>}{isShared && sharedPermission === 'editor' && <div className="detail-management"><button onClick={onRename}>Rename document</button></div>}</div></div><div className="metadata-callout"><FileText size={17} /><span><b>About your document data</b><small>Document details are stored separately from file contents in private cloud storage.</small></span></div></div>
}

export default function WorkspacePage({ mode = 'documents' }) {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { documents, folders, isLoading, error: dataError, loadDocumentsForView, loadDocument, updateDocument, toggleFavorite, moveToTrash, restoreDocument, permanentlyDelete, addDocuments, createFolder, renameFolder, deleteFolder, moveDocument, getDownloadUrl, getPreviewUrl, shareDocument } = useDocuments()
  const search = searchParams.get('q') || ''
  const setSearch = (value) => setSearchParams((params) => { if (value) params.set('q', value); else params.delete('q'); return params }, { replace: true })
  const [typeFilter, setTypeFilter] = useState('All types')
  const [sortBy, setSortBy] = useState('Recently updated')
  const [view, setView] = useState('list')
  const [dialog, setDialog] = useState(null)
  const [preview, setPreview] = useState(null)
  const [uploadOpen, setUploadOpenState] = useState(searchParams.get('upload') === '1')
  const [folderName, setFolderName] = useState('')
  const [folderEdit, setFolderEdit] = useState(null)
  const [folderDelete, setFolderDelete] = useState(null)
  const [remoteCollection, setRemoteCollection] = useState(null)
  const [remoteDetailState, setRemoteDetailState] = useState({ id: null, document: null, error: '' })
  const [viewLoading, setViewLoading] = useState(false)
  const [viewError, setViewError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const usesServerCollection = ['trash', 'favorites', 'recent', 'shared'].includes(mode)
      || (mode === 'documents' && Boolean(search.trim()))
    if (!usesServerCollection) return undefined

    let active = true
    const timer = window.setTimeout(() => {
      setRemoteCollection(null)
      setViewError('')
      setViewLoading(true)
      loadDocumentsForView(mode, search)
        .then((items) => {
          if (active) {
            setRemoteCollection(items)
            setViewError('')
          }
        })
        .catch((error) => {
          if (active) setViewError(getApiErrorMessage(error, 'Could not load these documents.'))
        })
        .finally(() => {
          if (active) setViewLoading(false)
        })
    }, mode === 'documents' ? 250 : 0)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [mode, search, loadDocumentsForView])

  useEffect(() => {
    const hasOwnedDocument = documents.some((document) => document.id === id)
    const hasSharedDocument = remoteCollection?.some((document) => document.id === id)
    if (mode !== 'detail' || hasOwnedDocument || hasSharedDocument) return undefined

    let active = true
    loadDocument(id)
      .then((document) => { if (active) setRemoteDetailState({ id, document, error: '' }) })
      .catch((error) => { if (active) setRemoteDetailState({ id, document: null, error: getApiErrorMessage(error, 'Could not load this document.') }) })

    return () => { active = false }
  }, [mode, id, documents, remoteCollection, loadDocument])

  const setUploadOpen = (isOpen) => {
    setUploadOpenState(isOpen)
    if (!isOpen && searchParams.get('upload') === '1') setSearchParams((params) => { params.delete('upload'); return params }, { replace: true })
  }

  const selectedFolder = mode === 'folder' ? folders.find((folder) => folder.id === id) : null
  const childFolders = mode === 'folder' ? folders.filter((folder) => folder.parentFolderId === id) : []
  const hasRemoteCollection = ['trash', 'favorites', 'recent', 'shared'].includes(mode)
    || (mode === 'documents' && Boolean(search.trim()))
  const visibleViewError = hasRemoteCollection ? viewError : ''
  let collection = hasRemoteCollection ? remoteCollection || [] : documents
  if (!hasRemoteCollection && mode === 'recent') collection = [...collection].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  if (!hasRemoteCollection && mode === 'favorites') collection = collection.filter((document) => document.isFavorite)
  if (!hasRemoteCollection && mode === 'trash') collection = []
  const sharedRecords = mode === 'shared' ? collection.map((document) => ({
    documentId: document.id,
    sharedBy: document.owner?.name || document.owner?.email || 'Document owner',
    sharedAt: document.sharedAt,
    permission: document.permission === 'editor' ? 'Editor' : 'Viewer',
  })) : []
  if (mode === 'folder') collection = collection.filter((document) => document.folderId === id)

  const visibleDocuments = collection.filter((document) => {
    const normalizedSearch = search.toLowerCase().trim()
    const matchesSearch = !normalizedSearch || (mode === 'documents' && hasRemoteCollection) || [document.name, document.originalName, document.fileType, document.folder, format(new Date(document.updatedAt), 'MMM d yyyy')].join(' ').toLowerCase().includes(normalizedSearch)
    return matchesSearch && (typeFilter === 'All types' || document.fileType === typeFilter)
  }).sort((a, b) => sortBy === 'Name A-Z' ? a.name.localeCompare(b.name) : sortBy === 'File size' ? b.size - a.size : new Date(b.updatedAt) - new Date(a.updatedAt))

  const activeOwnedDetail = documents.find((document) => document.id === id)
  const activeSharedDetail = remoteCollection?.find((document) => document.id === id)
  const activeDetail = mode === 'detail'
    ? activeOwnedDetail || activeSharedDetail || (remoteDetailState.id === id ? remoteDetailState.document : null)
    : null
  const detailError = mode === 'detail' && remoteDetailState.id === id ? remoteDetailState.error : ''
  const detailLoading = mode === 'detail' && !activeOwnedDetail && !activeSharedDetail && remoteDetailState.id !== id
  const details = mode === 'folder' ? { title: selectedFolder?.name || 'Folder', eyebrow: 'YOUR FOLDER', description: 'Everything you’ve gathered in this place.' } : pageDetails[mode] || pageDetails.documents
  const openAction = (type, document) => setDialog({ type, document })
  const handleRequestError = (error, fallback) => toast.error(getApiErrorMessage(error, fallback))
  const download = async (document) => {
    try {
      const url = await getDownloadUrl(document.id)
      window.location.assign(url)
    } catch (error) {
      handleRequestError(error, 'Could not download this document.')
    }
  }
  const openPreview = async (document) => {
    if (document.mimeType !== 'application/pdf' && !document.mimeType?.startsWith('image/')) {
      toast('This file type is download-only.')
      return
    }
    try {
      const url = await getPreviewUrl(document.id)
      setPreview({ document, url })
    } catch (error) {
      handleRequestError(error, 'Could not load this preview.')
    }
  }
  const performDelete = async () => { try { await moveToTrash(dialog.document.id); toast.success('Document moved to trash'); setDialog(null) } catch (error) { handleRequestError(error, 'Could not move this document to trash.') } }
  const performPermanentDelete = async () => { try { await permanentlyDelete(dialog.document.id); setRemoteCollection((items) => items?.filter((item) => item.id !== dialog.document.id) || items); toast.success('Document permanently deleted'); setDialog(null) } catch (error) { handleRequestError(error, 'Could not permanently delete this document.') } }
  const performShare = async (event) => { event.preventDefault(); const email = event.currentTarget.elements.email.value.trim(); const permission = event.currentTarget.elements.permission.value; try { await shareDocument(dialog.document.id, email, permission); toast.success(`Shared with ${email}`); setDialog(null) } catch (error) { handleRequestError(error, 'Could not share this document.') } }
  const performRename = async (event) => { event.preventDefault(); const name = event.currentTarget.elements.name.value.trim(); if (!name) return; try { await updateDocument(dialog.document.id, { name }); toast.success('Document renamed'); setDialog(null) } catch (error) { handleRequestError(error, 'Could not rename this document.') } }
  const performMove = async (event) => { event.preventDefault(); const folderId = event.currentTarget.elements.folder.value || null; try { await moveDocument(dialog.document.id, folderId); toast.success('Document moved'); setDialog(null) } catch (error) { handleRequestError(error, 'Could not move this document.') } }
  const performFolderCreate = async (event) => { event.preventDefault(); if (!folderName.trim()) return; try { await createFolder(folderName.trim()); toast.success('Folder created'); setFolderName('') } catch (error) { handleRequestError(error, 'Could not create this folder.') } }
  const performFolderRename = async (event) => { event.preventDefault(); const name = event.currentTarget.elements.name.value.trim(); if (!name) return; try { await renameFolder(folderEdit.id, name); setFolderEdit(null); toast.success(`Folder renamed to ${name}`) } catch (error) { handleRequestError(error, 'Could not rename this folder.') } }
  const performFolderDelete = async () => { try { await deleteFolder(folderDelete.id); setFolderDelete(null); toast.success('Folder deleted') } catch (error) { handleRequestError(error, 'Could not delete this folder.') } }
  const actionProps = (document) => {
    const sharedPermission = mode === 'shared' ? document.permission : null
    return {
      document,
      sharedPermission,
      onPreview: () => openPreview(document),
      onDownload: () => download(document),
      onRestore: async () => { try { await restoreDocument(document.id); if (mode === 'trash') setRemoteCollection((items) => items?.filter((item) => item.id !== document.id) || items); toast.success('Document restored') } catch (error) { handleRequestError(error, 'Could not restore this document.') } },
      onPermanentDelete: () => openAction('permanent', document),
      ...(sharedPermission ? {
        onRename: sharedPermission === 'editor' ? () => openAction('rename', document) : undefined,
      } : {
        onRename: () => openAction('rename', document),
        onShare: () => openAction('share', document),
        onMove: () => openAction('move', document),
        onDelete: () => openAction('delete', document),
        onToggleFavorite: async () => { try { const updated = await toggleFavorite(document.id); toast.success(updated.isFavorite ? 'Added to favorites' : 'Removed from favorites') } catch (error) { handleRequestError(error, 'Could not update this favorite.') } },
      }),
    }
  }

  if (mode === 'detail') {
    if (detailError) return <EmptyState icon={FileText} title="Could not load document" description={detailError} action={<Button variant="secondary" onClick={() => navigate('/documents')}>Back to documents</Button>} />
    if (detailLoading) return <div className="route-loading" role="status" aria-label="Loading document"><span /></div>
    if (!activeDetail) return <EmptyState icon={FileText} title="Document not found" description="This document may have been removed or is not shared with your account." action={<Button variant="secondary" onClick={() => navigate('/documents')}>Back to documents</Button>} />
    return <><DocumentDetail document={activeDetail} sharedPermission={activeDetail.permission} onDownload={() => download(activeDetail)} onPreview={() => openPreview(activeDetail)} onRename={() => openAction('rename', activeDetail)} onMove={() => openAction('move', activeDetail)} onDelete={() => openAction('delete', activeDetail)} onToggleFavorite={async () => { try { await toggleFavorite(activeDetail.id); toast.success('Favorite updated') } catch (error) { handleRequestError(error, 'Could not update this favorite.') } }} />{preview && <DocumentPreviewModal document={preview.document} previewUrl={preview.url} onDownload={() => download(preview.document)} onClose={() => setPreview(null)} />}{dialog && <ActionDialog dialog={dialog} folders={folders} onClose={() => setDialog(null)} onRename={performRename} onMove={performMove} onDelete={performDelete} onShare={performShare} onPermanentDelete={performPermanentDelete} />}</>
  }

  if (mode === 'folders') return <motion.section className="collection-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}><div className="page-heading"><div><span className="eyebrow">{details.eyebrow}</span><h1>{details.title}</h1><p>{details.description}</p></div><Button onClick={() => document.getElementById('new-folder-name')?.focus()}><Plus size={16} /> New folder</Button></div><form className="inline-folder-form" onSubmit={performFolderCreate}><FolderClosed size={17} /><input id="new-folder-name" value={folderName} onChange={(event) => setFolderName(event.target.value)} placeholder="Name a new folder" aria-label="New folder name" /><Button type="submit" variant="secondary">Create folder</Button></form><div className="folder-grid folder-grid-page">{folders.map((folder) => <FolderTile key={folder.id} folder={folder} count={documents.filter((document) => document.folderId === folder.id && !document.isDeleted).length} onRename={() => setFolderEdit(folder)} onDelete={() => setFolderDelete(folder)} />)}</div>{folderEdit && <Modal title="Rename folder" onClose={() => setFolderEdit(null)}><form className="modal-form" onSubmit={performFolderRename}><label className="field"><span>Folder name</span><input name="name" defaultValue={folderEdit.name} autoFocus /></label><div className="modal-actions"><Button variant="quiet" type="button" onClick={() => setFolderEdit(null)}>Cancel</Button><Button type="submit">Save changes</Button></div></form></Modal>}{folderDelete && <Modal title="Delete this folder?" onClose={() => setFolderDelete(null)}><p className="confirm-copy">Move documents and nested folders before deleting this folder.</p><div className="modal-actions"><Button variant="quiet" onClick={() => setFolderDelete(null)}>Cancel</Button><Button variant="danger" onClick={performFolderDelete}>Delete folder</Button></div></Modal>}</motion.section>

  const folderDocs = folders.find((folder) => folder.id === id)
  return <motion.section className="collection-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
    {mode === 'folder' && <div className="breadcrumb"><Link to="/folders">Folders</Link><span>/</span><span>{folderDocs?.name || 'Folder'}</span></div>}
    <div className="page-heading"><div><span className="eyebrow">{details.eyebrow}</span><h1>{details.title}</h1><p>{details.description}</p></div><div className="page-heading-actions">{mode !== 'trash' && <Button variant="secondary" onClick={() => setUploadOpen(true)}><UploadCloud size={16} /> Upload</Button>}{mode === 'documents' || mode === 'folder' ? <Button onClick={() => navigate('/folders')}><Plus size={16} /> New folder</Button> : null}</div></div>
    {mode === 'folder' && childFolders.length > 0 && <section className="content-section folders-section"><div className="section-heading"><div><span className="eyebrow">NESTED FOLDERS</span><h2>Inside this folder</h2></div></div><div className="folder-grid folder-grid-page">{childFolders.map((folder, index) => <FolderTile key={folder.id} folder={{ ...folder, color: folder.color || ['#d8e9df', '#e9e2d7', '#e0e8ef', '#f1e4dc'][index % 4] }} count={documents.filter((document) => document.folderId === folder.id && !document.isDeleted).length} onRename={() => setFolderEdit(folder)} onDelete={() => setFolderDelete(folder)} />)}</div></section>}
    {mode === 'trash' && <div className="trash-notice"><span>Items remain here until you restore them.</span><span>{visibleDocuments.length} {visibleDocuments.length === 1 ? 'item' : 'items'}</span></div>}
    {mode === 'shared' && <div className="shared-notice"><span>Documents shared with your account.</span></div>}
    <div className="collection-toolbar"><label className="collection-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={mode === 'shared' ? 'Search shared documents' : 'Search by name or file type'} /><kbd>/</kbd></label><div className="toolbar-controls"><label className="select-control"><Filter size={15} /><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Filter by file type"><option>All types</option>{[...new Set(collection.map((document) => document.fileType))].sort().map((type) => <option key={type}>{type}</option>)}</select><ChevronDown size={14} /></label><label className="select-control sort-control"><SlidersHorizontal size={15} /><select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sort documents"><option>Recently updated</option><option>Name A-Z</option><option>File size</option></select><ChevronDown size={14} /></label><div className="view-toggle" role="group" aria-label="Change document view"><button className={view === 'list' ? 'selected' : ''} aria-label="List view" onClick={() => setView('list')}><List size={17} /></button><button className={view === 'grid' ? 'selected' : ''} aria-label="Grid view" onClick={() => setView('grid')}><Grid2X2 size={16} /></button></div></div></div>
    {visibleViewError || dataError ? <EmptyState icon={FileText} title="Could not load documents" description={visibleViewError || dataError} /> : isLoading || (hasRemoteCollection && viewLoading) ? <div className="route-loading" role="status" aria-label="Loading documents"><span /></div> : visibleDocuments.length ? view === 'grid' ? <div className="document-grid">{visibleDocuments.map((document) => <DocumentCard key={document.id} {...actionProps(document)} isTrash={mode === 'trash'} />)}</div> : <DocumentTable documents={visibleDocuments} isTrash={mode === 'trash'} sharedRecords={sharedRecords} sharedPermissionFor={(document) => document.permission} renderActions={actionProps} /> : <EmptyState icon={mode === 'trash' ? FileText : Search} title={search ? 'No documents found' : mode === 'trash' ? 'Your trash is empty' : mode === 'favorites' ? 'Nothing saved here yet' : mode === 'shared' ? 'Nothing has been shared with you' : 'No documents here yet'} description={search ? 'Try another document name or file type.' : mode === 'trash' ? 'Deleted files will wait here in case you change your mind.' : mode === 'favorites' ? 'Mark a document as a favorite and it will show up here.' : mode === 'shared' ? 'Documents shared with your account will appear here.' : 'Add a document to give this space a good start.'} action={mode !== 'trash' && mode !== 'favorites' && mode !== 'shared' && <Button onClick={() => setUploadOpen(true)}><UploadCloud size={15} /> Add a document</Button>} />}
    <div className="collection-footer"><span>Showing {visibleDocuments.length} {visibleDocuments.length === 1 ? 'document' : 'documents'}</span>{visibleDocuments.length > 0 && <span>Sorted by {sortBy.toLowerCase()}</span>}</div>
    {preview && <DocumentPreviewModal document={preview.document} previewUrl={preview.url} onDownload={() => download(preview.document)} onClose={() => setPreview(null)} />}{uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} onUpload={(file, onProgress) => addDocuments(file, onProgress)} />}{dialog && <ActionDialog dialog={dialog} folders={folders} onClose={() => setDialog(null)} onRename={performRename} onMove={performMove} onDelete={performDelete} onShare={performShare} onPermanentDelete={performPermanentDelete} />}
  </motion.section>
}

function ActionDialog({ dialog, folders, onClose, onRename, onMove, onDelete, onShare, onPermanentDelete }) {
  const isRename = dialog.type === 'rename'
  const isMove = dialog.type === 'move'
  const isShare = dialog.type === 'share'
  const isPermanent = dialog.type === 'permanent'
  return <Modal title={isRename ? 'Rename document' : isMove ? 'Move document' : isShare ? 'Share document' : isPermanent ? 'Permanently delete?' : 'Move to trash?'} eyebrow={dialog.document.name} onClose={onClose}>
    {isRename ? <form className="modal-form" onSubmit={onRename}><label className="field"><span>Document name</span><input name="name" defaultValue={dialog.document.name} autoFocus /></label><div className="modal-actions"><Button variant="quiet" type="button" onClick={onClose}>Cancel</Button><Button type="submit">Save changes</Button></div></form> : isMove ? <form className="modal-form" onSubmit={onMove}><label className="field"><span>Choose a folder</span><select name="folder" defaultValue={dialog.document.folderId || ''}><option value="">My Documents</option>{folders.map((folder) => <option value={folder.id} key={folder.id}>{folder.name}</option>)}</select></label><div className="modal-actions"><Button variant="quiet" type="button" onClick={onClose}>Cancel</Button><Button type="submit">Move document</Button></div></form> : isShare ? <form className="modal-form" onSubmit={onShare}><label className="field"><span>Recipient email</span><input name="email" type="email" placeholder="person@example.com" required autoFocus /></label><label className="field"><span>Permission</span><select name="permission" defaultValue="viewer"><option value="viewer">Viewer</option><option value="editor">Editor</option></select></label><div className="modal-actions"><Button variant="quiet" type="button" onClick={onClose}>Cancel</Button><Button type="submit">Share document</Button></div></form> : isPermanent ? <><p className="confirm-copy">This permanently removes the file from private storage and deletes its metadata. This cannot be undone.</p><div className="modal-actions"><Button variant="quiet" onClick={onClose}>Cancel</Button><Button variant="danger" onClick={onPermanentDelete}>Permanently delete</Button></div></> : <><p className="confirm-copy">The document will move to Trash, where you can restore it later.</p><div className="modal-actions"><Button variant="quiet" onClick={onClose}>Cancel</Button><Button variant="danger" onClick={onDelete}>Move to trash</Button></div></>}
  </Modal>
}
