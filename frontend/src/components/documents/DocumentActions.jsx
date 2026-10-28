import { useState } from 'react'
import { Download, Ellipsis, Eye, FolderInput, Heart, RotateCcw, Trash2, Pencil, Share2, Trash } from 'lucide-react'

export default function DocumentActions({ document, isTrash = false, sharedPermission, onPreview, onDownload, onRename, onShare, onMove, onDelete, onRestore, onPermanentDelete, onToggleFavorite }) {
  const [open, setOpen] = useState(false)
  const run = (action) => { setOpen(false); action?.() }
  return <div className="actions-wrap"><button className="row-more" aria-label={`Actions for ${document.name}`} aria-expanded={open} onClick={(event) => { event.preventDefault(); setOpen((value) => !value) }}><Ellipsis size={19} /></button>{open && <><button className="menu-dismiss" aria-label="Close actions" onClick={() => setOpen(false)} /><div className="document-actions-menu">
    {isTrash ? <><button onClick={() => run(onRestore)}><RotateCcw size={15} /> Restore document</button><button className="danger-menu-item" onClick={() => run(onPermanentDelete)}><Trash size={15} /> Permanently delete</button></> : sharedPermission ? <>
      <button onClick={() => run(onPreview)}><Eye size={15} /> Preview</button><button onClick={() => run(onDownload)}><Download size={15} /> Download</button>{sharedPermission === 'editor' && <button onClick={() => run(onRename)}><Pencil size={15} /> Rename</button>}
    </> : <>
      <button onClick={() => run(onPreview)}><Eye size={15} /> Preview</button><button onClick={() => run(onDownload)}><Download size={15} /> Download</button><button onClick={() => run(onRename)}><Pencil size={15} /> Rename</button><button onClick={() => run(onMove)}><FolderInput size={15} /> Move to folder</button><button onClick={() => run(onToggleFavorite)}><Heart size={15} /> {document.isFavorite ? 'Remove from favorites' : 'Add to favorites'}</button><button onClick={() => run(onShare)}><Share2 size={15} /> Share</button><span className="menu-rule" /><button className="danger-menu-item" onClick={() => run(onDelete)}><Trash2 size={15} /> Move to trash</button>
    </>}
  </div></>}</div>
}
