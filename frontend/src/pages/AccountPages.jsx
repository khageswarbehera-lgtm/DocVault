import { useRef, useState } from 'react'
import { Bell, Check, ChevronRight, CircleUserRound, HardDrive, KeyRound, LockKeyhole, Mail, Shield, UserRound, Camera, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/useAuth'
import { Button } from '../components/common/UI'
import { getApiErrorMessage } from '../services/api'

export function ProfilePage() {
  const { user, updateAvatar } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [editing, setEditing] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarInputRef = useRef(null)
  const save = async (event) => {
    event.preventDefault()
    toast.error('Profile information updates (name/email) are not yet supported by the backend.')
  }
  const uploadProfilePhoto = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      toast.error('Choose a JPG or PNG image no larger than 5 MB.')
      return
    }
    setAvatarUploading(true)
    try {
      await updateAvatar(file)
      toast.success('Profile photo updated')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not update your profile photo.'))
    } finally {
      setAvatarUploading(false)
    }
  }

  return <section className="account-page"><div className="page-heading"><div><span className="eyebrow">THE PERSON BEHIND THE PAPERS</span><h1>Your profile</h1><p>A few details about you and your DocVault space.</p></div>{!editing && <Button variant="secondary" onClick={() => setEditing(true)}>Edit profile</Button>}</div><div className="profile-overview"><div className="profile-identity"><div className="profile-avatar">{user?.avatar && <img src={user.avatar} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />}{!user?.avatar && user?.initials}<button type="button" aria-label="Change profile photo" title="Change profile photo" disabled={avatarUploading} onClick={() => avatarInputRef.current?.click()}><Camera size={15} /></button><input ref={avatarInputRef} type="file" accept="image/jpeg,image/png" hidden onChange={uploadProfilePhoto} /></div><div><h2>{name}</h2><p>{email}</p><span className="profile-plan"><Check size={13} /> Account</span></div></div><span className="profile-since">{user?.createdAt ? `Member since ${new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` : 'Member'}</span></div><form className="profile-form" onSubmit={save}><div className="form-section-heading"><div><span className="eyebrow">ACCOUNT INFORMATION</span><h2>Personal details</h2></div><p>Used to personalize your DocVault experience.</p></div><div className="profile-fields"><label className="field"><span>Full name</span><div className="input-with-icon"><UserRound size={16} /><input disabled={!editing} value={name} onChange={(event) => setName(event.target.value)} /></div></label><label className="field"><span>Email address</span><div className="input-with-icon"><Mail size={16} /><input disabled={!editing} type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div></label></div>{editing && <div className="profile-form-actions"><Button type="button" variant="quiet" onClick={() => { setName(user?.name || ''); setEmail(user?.email || ''); setEditing(false) }}>Cancel</Button><Button type="submit"><Save size={15} /> Save profile</Button></div>}</form><div className="account-security-row"><span className="account-row-icon"><Shield size={18} /></span><span><b>Account security</b><small>Password and sign-in options</small></span><span className="account-row-status">Protected</span></div></section>
}

export function SettingsPage() {
  const [settings, setSettings] = useState({ emailDigest: true, productNotes: false, compactView: false })
  const update = (key) => setSettings((current) => ({ ...current, [key]: !current[key] }))
  const sections = [
    { title: 'Account', icon: CircleUserRound, rows: [{ key: 'profile', title: 'Personal information', description: 'Your name and email address', action: 'Open profile' }, { key: 'security', title: 'Password and security', description: 'Sign-in details and active sessions', action: 'Not connected' }] },
    { title: 'Notifications', icon: Bell, rows: [{ key: 'emailDigest', title: 'Email updates', description: 'Occasional reminders about your document space', toggle: true }, { key: 'productNotes', title: 'Product notes', description: 'News when new features are available', toggle: true }] },
    { title: 'Storage preferences', icon: HardDrive, rows: [{ key: 'compactView', title: 'Compact document rows', description: 'Show more files in the document list', toggle: true }, { key: 'storage', title: 'Manage storage', description: 'Usage and file type breakdown', action: 'View usage' }] },
  ]

  return <section className="account-page settings-page"><div className="page-heading"><div><span className="eyebrow">MAKE IT FEEL LIKE YOURS</span><h1>Settings</h1><p>Your account, notifications and workspace preferences.</p></div></div>{sections.map(({ title, icon: Icon, rows }) => <section className="settings-section" key={title}><div className="settings-section-title"><span><Icon size={18} /></span><h2>{title}</h2></div><div className="settings-rows">{rows.map((row) => <div className="settings-row" key={row.key}><div><b>{row.title}</b><small>{row.description}</small></div>{row.toggle ? <button className={`toggle ${settings[row.key] ? 'toggle-on' : ''}`} aria-pressed={settings[row.key]} aria-label={`${row.title} ${settings[row.key] ? 'on' : 'off'}`} onClick={() => update(row.key)}><i /></button> : <button className="settings-row-action" onClick={() => row.key === 'profile' ? window.location.assign('/profile') : row.key === 'storage' ? window.location.assign('/storage') : toast('Password and session management require a backend endpoint.')}>{row.action} <ChevronRight size={15} /></button>}</div>)}</div></section>)}<div className="settings-callout"><LockKeyhole size={17} /><span><b>Local preview settings</b><small>Notification and display toggles only last for this page session.</small></span><KeyRound size={17} /></div></section>
}
