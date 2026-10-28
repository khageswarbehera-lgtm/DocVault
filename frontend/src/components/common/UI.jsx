import { useEffect } from 'react'
import { FileArchive, FileImage, FileSpreadsheet, FileText, File, X, Search, ArrowUpRight } from 'lucide-react'
import { formatBytes } from '../../utils/format'

export function Button({ children, variant = 'primary', className = '', ...props }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>
}

export function IconButton({ label, className = '', children, ...props }) {
  return <button type="button" className={`icon-button ${className}`} aria-label={label} title={label} {...props}>{children}</button>
}

export function Badge({ children, tone = 'neutral' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

export function FileIcon({ type = 'FILE', size = 19 }) {
  const normalized = type.toUpperCase()
  const Icon = normalized === 'PDF' ? FileText : ['JPG', 'JPEG', 'PNG', 'WEBP'].includes(normalized) ? FileImage : ['XLS', 'XLSX', 'CSV'].includes(normalized) ? FileSpreadsheet : ['ZIP', 'RAR'].includes(normalized) ? FileArchive : ['DOC', 'DOCX', 'TXT'].includes(normalized) ? FileText : File
  const tone = normalized === 'PDF' ? 'file-red' : ['JPG', 'JPEG', 'PNG', 'WEBP'].includes(normalized) ? 'file-amber' : ['XLS', 'XLSX', 'CSV'].includes(normalized) ? 'file-green' : 'file-blue'
  return <span className={`file-icon ${tone}`}><Icon size={size} strokeWidth={1.8} /></span>
}

export function Modal({ title, eyebrow, onClose, children, wide = false }) {
  useEffect(() => {
    const onKeyDown = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
      <header className="modal-head">
        <div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2></div>
        <IconButton label="Close dialog" onClick={onClose}><X size={18} /></IconButton>
      </header>
      {children}
    </section>
  </div>
}

export function EmptyState({ icon: Icon = Search, title, description, action }) {
  return <div className="empty-state"><span className="empty-icon"><Icon size={21} /></span><h3>{title}</h3><p>{description}</p>{action}</div>
}

export function DocumentMeta({ document }) {
  return <span className="document-meta">{formatBytes(document.size)} <span>·</span> {document.fileType}</span>
}

export function ViewLink({ to, children }) {
  return <a className="view-link" href={to}>{children}<ArrowUpRight size={15} /></a>
}
