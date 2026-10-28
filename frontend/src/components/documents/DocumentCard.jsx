import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { FileIcon, DocumentMeta } from '../common/UI'
import DocumentActions from './DocumentActions'

export default function DocumentCard({ document, isTrash = false, sharedPermission, onPreview, onDownload, onShare, onRename, onMove, onDelete, onRestore, onPermanentDelete, onToggleFavorite }) {
  return <article className="document-card"><div className={`document-art document-art-${document.color || 'blue'}`}><span className="document-art-paper"><FileIcon type={document.fileType} size={24} /></span>{document.isFavorite && !isTrash && <span className="favorite-indicator"><Star size={12} fill="currentColor" /></span>}<DocumentActions document={document} isTrash={isTrash} sharedPermission={sharedPermission} onPreview={onPreview} onDownload={onDownload} onShare={onShare} onRename={onRename} onMove={onMove} onDelete={onDelete} onRestore={onRestore} onPermanentDelete={onPermanentDelete} onToggleFavorite={onToggleFavorite} /></div><div className="document-card-body"><Link to={`/documents/${document.id}`} className="document-card-title">{document.name}</Link><DocumentMeta document={document} /><div className="document-card-foot"><span>{isTrash ? 'Deleted' : document.folder}</span><span>{formatDistanceToNow(new Date(isTrash ? document.deletedAt || document.updatedAt : document.updatedAt), { addSuffix: true })}</span></div></div></article>
}
