import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { FolderClosed } from 'lucide-react'

export function FolderCard({ folder, count, onRename, onDelete }) {
  return <article className="folder-tile folder-tile-large" style={{ '--folder-tint': folder.color || '#dcece4' }}><Link to={`/folders/${folder.id}`} className="folder-open"><span className="folder-tile-icon"><FolderClosed size={22} /></span><span className="folder-tile-more" aria-hidden="true">↗</span><b>{folder.name}</b><small>{count} {count === 1 ? 'document' : 'documents'}</small><span className="folder-tile-foot">Updated {format(new Date(folder.updatedAt), 'MMM d')}</span></Link><details className="folder-options"><summary aria-label={`Folder actions for ${folder.name}`}>•••</summary><div><button onClick={onRename}>Rename folder</button><button className="danger-menu-item" onClick={onDelete}>Delete folder</button></div></details></article>
}
