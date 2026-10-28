import { useRef, useState } from 'react'
import { Check, FileUp, Plus, UploadCloud, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button, FileIcon, Modal } from '../common/UI'
import { getApiErrorMessage } from '../../services/api'

const MAX_BYTES = 25 * 1024 * 1024
const ALLOWED_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'jpg', 'jpeg', 'png'])
const prettySize = (bytes) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`

export default function UploadModal({ onClose, onUpload }) {
  const [files, setFiles] = useState([])
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const addFiles = (fileList) => {
    const accepted = []
    Array.from(fileList || []).forEach((file) => {
      if (file.size > MAX_BYTES) { toast.error(`${file.name} is larger than 25 MB.`); return }
      const extension = file.name.split('.').pop()?.toLowerCase()
      if (!ALLOWED_EXTENSIONS.has(extension)) { toast.error(`${file.name} is not a supported file type.`); return }
      accepted.push(file)
    })
    setFiles((current) => [...current, ...accepted.filter((file) => !current.some((item) => item.name === file.name && item.size === file.size))])
  }

  const startUpload = async () => {
    if (!files.length) return
    setUploading(true)
    setProgress(0)
    let uploadedCount = 0

    try {
      for (let index = 0; index < files.length; index += 1) {
        await onUpload(files[index], (event) => {
          const fileProgress = event.total ? event.loaded / event.total : 0
          setProgress(Math.min(99, Math.round(((index + fileProgress) / files.length) * 100)))
        })
        uploadedCount += 1
        setFiles((current) => current.filter((file) => file !== files[index]))
        setProgress(Math.round((uploadedCount / files.length) * 100))
      }

      toast.success(`${uploadedCount} ${uploadedCount === 1 ? 'document' : 'documents'} uploaded successfully`)
      onClose()
    } catch (error) {
      setUploading(false)
      toast.error(`${uploadedCount ? `${uploadedCount} uploaded. ` : ''}${getApiErrorMessage(error, 'Upload failed. Please try again.')}`)
    }
  }

  return <Modal title={uploading ? 'Uploading your files' : 'Add documents'} eyebrow="YOUR PERSONAL VAULT" onClose={onClose}>
    {uploading ? <div className="upload-progress-panel"><div className="upload-success-icon">{progress >= 100 ? <Check size={22} /> : <UploadCloud size={22} />}</div><h3>{progress >= 100 ? 'All set.' : 'Uploading your files.'}</h3><p>Your files are being securely sent to DocVault storage.</p><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><div className="progress-caption"><span>{files.length} {files.length === 1 ? 'file' : 'files'} remaining</span><b>{progress}%</b></div></div> : <><button className={`upload-dropzone ${dragging ? 'upload-dropzone-active' : ''}`} onClick={() => inputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files) }}><span className="upload-drop-icon"><UploadCloud size={23} /></span><b>Drop your files here, or <u>browse</u></b><span>PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, JPG and PNG · up to 25 MB each</span><input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png" multiple hidden onChange={(event) => { addFiles(event.target.files); event.target.value = '' }} /></button>
    {files.length > 0 ? <div className="upload-file-list"><div className="upload-list-head"><b>Selected files</b><span>{files.length} {files.length === 1 ? 'file' : 'files'}</span></div>{files.map((file, index) => <div className="upload-file-row" key={`${file.name}-${file.size}-${index}`}><FileIcon type={file.name.split('.').pop()} /><span><b>{file.name}</b><small>{prettySize(file.size)}</small></span><button aria-label={`Remove ${file.name}`} onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}><X size={16} /></button></div>)}<button className="add-more-files" onClick={() => inputRef.current?.click()}><Plus size={15} /> Add more files</button></div> : <div className="upload-empty-tip"><FileUp size={15} /><span>Files are uploaded to your private DocVault storage.</span></div>}
    <div className="modal-actions"><Button variant="quiet" onClick={onClose}>Cancel</Button><Button disabled={!files.length} onClick={startUpload}>Add {files.length ? `${files.length} ${files.length === 1 ? 'file' : 'files'}` : 'files'} <UploadCloud size={15} /></Button></div></>}
  </Modal>
}
