import { FileText, Maximize2, Printer } from 'lucide-react'
import { Button, Modal } from '../common/UI'

export default function DocumentPreviewModal({ document, previewUrl, onDownload, onClose }) {
  const isImage = document.mimeType?.startsWith('image/')
  const isPdf = document.mimeType === 'application/pdf'
  const supported = isImage || isPdf
  return <Modal title={document.name} eyebrow={`${document.fileType} · ${document.folder || 'My Documents'}`} onClose={onClose} wide>
    <div className="preview-toolbar"><span>{document.originalName}</span><div><button className="preview-tool" onClick={() => window.print()} aria-label="Print preview"><Printer size={16} /></button><button className="preview-tool" aria-label="Expand preview"><Maximize2 size={16} /></button></div></div>
    <div className={`preview-stage ${isImage ? 'preview-stage-image' : ''}`}>
      {!supported || !previewUrl ? <div className="preview-unavailable"><FileText size={28} /><b>Preview not available</b><span>{supported ? 'The secure preview URL could not be loaded.' : 'This file type is download-only.'}</span><Button variant="secondary" onClick={onDownload}>Download document</Button></div> : isPdf ? <object aria-label={`PDF preview: ${document.name}`} data={previewUrl} type="application/pdf" style={{ width: '100%', height: '65vh' }}><div className="preview-unavailable"><FileText size={28} /><b>Preview not available</b><span>Your browser cannot display this PDF.</span><Button variant="secondary" onClick={onDownload}>Download document</Button></div></object> : <img src={previewUrl} alt={document.name} style={{ display: 'block', maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain' }} />}
    </div>
  </Modal>
}
