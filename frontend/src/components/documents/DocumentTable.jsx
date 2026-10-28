import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { FileIcon, DocumentMeta } from '../common/UI'
import DocumentActions from './DocumentActions'

export default function DocumentTable({ documents, isTrash = false, sharedRecords = [], sharedPermissionFor, renderActions, ...actions }) {
  return <div className="table-scroll"><table className="document-table"><thead><tr><th>Name</th><th>Folder</th>{sharedRecords.length > 0 && <th>Owner</th>}{sharedRecords.length > 0 && <th>Shared</th>}<th>File size</th><th>{isTrash ? 'Deleted' : 'Last modified'}</th>{sharedRecords.length > 0 && <th>Permission</th>}<th><span className="sr-only">Actions</span></th></tr></thead><tbody>{documents.map((document) => {
    const shared = sharedRecords.find((record) => record.documentId === document.id)
    return <tr key={document.id}><td><div className="table-document-name"><FileIcon type={document.fileType} /><span><Link to={`/documents/${document.id}`}>{document.name}</Link><DocumentMeta document={document} /></span></div></td><td>{document.folder || 'My Documents'}</td>{sharedRecords.length > 0 && <td>{shared?.sharedBy || '—'}</td>}{sharedRecords.length > 0 && <td>{shared?.sharedAt ? format(new Date(shared.sharedAt), 'MMM d, yyyy') : '—'}</td>}<td>{new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(document.size / (1024 * 1024))} MB</td><td>{format(new Date(isTrash ? document.deletedAt || document.updatedAt : document.updatedAt), 'MMM d, yyyy')}</td>{sharedRecords.length > 0 && <td><span className={`permission-tag ${shared?.permission === 'Editor' ? 'permission-editor' : ''}`}>{shared?.permission || 'Viewer'}</span></td>}<td><DocumentActions document={document} isTrash={isTrash} sharedPermission={sharedPermissionFor?.(document)} {...(renderActions ? renderActions(document) : actions)} /></td></tr>
  })}</tbody></table></div>
}
