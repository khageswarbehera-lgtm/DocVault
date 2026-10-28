import { useState } from 'react'
import { FolderClosed, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { useDocuments } from '../context/useDocuments'
import { Button, EmptyState, Modal } from '../components/common/UI'
import { FolderCard } from '../components/folders/FolderCard'
import { getApiErrorMessage } from '../services/api'

export default function FoldersPage() {
  const { documents, folders, createFolder, renameFolder, deleteFolder, isLoading, error } = useDocuments()
  const [newName, setNewName] = useState('')
  const [parentFolderId, setParentFolderId] = useState('')
  const [editingFolder, setEditingFolder] = useState(null)
  const [deletingFolder, setDeletingFolder] = useState(null)

  const create = async (event) => {
    event.preventDefault()
    if (!newName.trim()) return
    try {
      await createFolder(newName.trim(), parentFolderId || null)
      setNewName('')
      setParentFolderId('')
      toast.success('Folder created')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not create this folder.'))
    }
  }
  const rename = async (event) => {
    event.preventDefault()
    const name = event.currentTarget.elements.name.value.trim()
    if (!name) return
    try {
      await renameFolder(editingFolder.id, name)
      setEditingFolder(null)
      toast.success('Folder renamed')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not rename this folder.'))
    }
  }
  const remove = async () => {
    try {
      await deleteFolder(deletingFolder.id)
      setDeletingFolder(null)
      toast.success('Folder deleted')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Move child folders and documents before deleting this folder.'))
    }
  }

  if (isLoading) return <div className="route-loading" role="status" aria-label="Loading folders"><span /></div>
  if (error) return <section className="collection-page"><EmptyState icon={FolderClosed} title="Could not load folders" description={error} /></section>

  return <section className="collection-page"><div className="page-heading"><div><span className="eyebrow">A PLACE FOR EVERYTHING</span><h1>Your folders</h1><p>A little structure makes the important things easier to find.</p></div></div><form className="inline-folder-form" onSubmit={create}><FolderClosed size={17} /><input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Name a new folder" aria-label="New folder name" /><select value={parentFolderId} onChange={(event) => setParentFolderId(event.target.value)} aria-label="Parent folder"><option value="">Root folder</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select><Button type="submit" variant="secondary"><Plus size={14} /> Create folder</Button></form>{folders.length ? <div className="folder-grid folder-grid-page">{folders.map((folder) => <FolderCard key={folder.id} folder={folder} count={documents.filter((document) => document.folderId === folder.id && !document.isDeleted).length} onRename={() => setEditingFolder(folder)} onDelete={() => setDeletingFolder(folder)} />)}</div> : <div className="empty-state"><span className="empty-icon"><FolderClosed size={21} /></span><h3>No folders yet</h3><p>Create a folder to give your documents a place of their own.</p></div>}{editingFolder && <Modal title="Rename folder" onClose={() => setEditingFolder(null)}><form className="modal-form" onSubmit={rename}><label className="field"><span>Folder name</span><input name="name" defaultValue={editingFolder.name} autoFocus /></label><div className="modal-actions"><Button type="button" variant="quiet" onClick={() => setEditingFolder(null)}>Cancel</Button><Button type="submit">Save changes</Button></div></form></Modal>}{deletingFolder && <Modal title="Delete this folder?" onClose={() => setDeletingFolder(null)}><p className="confirm-copy">Move its documents and nested folders before deleting it.</p><div className="modal-actions"><Button variant="quiet" onClick={() => setDeletingFolder(null)}>Cancel</Button><Button variant="danger" onClick={remove}>Delete folder</Button></div></Modal>}</section>
}
