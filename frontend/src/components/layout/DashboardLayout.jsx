import { useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, CircleHelp, Clock3, FileText, FolderClosed, HardDrive, Heart, LayoutDashboard, LogOut, Menu, Search, Settings, Share2, ShieldCheck, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/useAuth'
import { useStorageStats } from '../../hooks/useStorageStats'
import { formatBytes } from '../../utils/format'
import { IconButton } from '../common/UI'

const mainNavigation = [
  { label: 'Overview', to: '/dashboard', icon: LayoutDashboard },
  { label: 'My documents', to: '/documents', icon: FileText },
  { label: 'Folders', to: '/folders', icon: FolderClosed },
]
const libraryNavigation = [
  { label: 'Recent', to: '/recent', icon: Clock3 },
  { label: 'Favorites', to: '/favorites', icon: Heart },
  { label: 'Shared with me', to: '/shared', icon: Share2 },
  { label: 'Trash', to: '/trash', icon: Trash2 },
]

export default function DashboardLayout({ children }) {
  const { user, signOut } = useAuth()
  const { pathname } = useLocation()
  const { stats, error: statsError } = useStorageStats({ watch: pathname })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const initials = user?.initials || ''
  const storageUsed = Number(stats?.storageUsed) || 0
  const storageLimit = Number(stats?.storageLimit) || 0
  const storageCaption = stats
    ? `${formatBytes(storageUsed)} of ${formatBytes(storageLimit)} used`
    : statsError
      ? 'Usage unavailable'
      : 'Checking usage…'

  const search = (event) => {
    event.preventDefault()
    navigate(`/documents?q=${encodeURIComponent(query)}`)
    setDrawerOpen(false)
  }

  const sidebar = <aside className={`sidebar ${drawerOpen ? 'sidebar-open' : ''}`}>
    <div className="sidebar-brand"><Link to="/dashboard" className="brand-lockup"><span className="brand-mark"><ShieldCheck size={21} strokeWidth={2} /></span><span>Doc<span>Vault</span></span></Link><IconButton label="Close navigation" className="mobile-close" onClick={() => setDrawerOpen(false)}><X size={18} /></IconButton></div>
      <Link to="/storage" className="storage-chip"><span className="storage-chip-icon"><HardDrive size={16} /></span><span><b>Personal vault</b><small>{storageCaption}</small></span><ChevronDown size={15} /></Link>
    <nav className="side-nav" aria-label="Main navigation">
      <p className="nav-caption">Workspace</p>
      {mainNavigation.map(({ label, to, icon: Icon }) => <NavLink key={to} to={to} end={to === '/dashboard'} onClick={() => setDrawerOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon size={18} /><span>{label}</span></NavLink>)}
      <p className="nav-caption nav-caption-spaced">Library</p>
      {libraryNavigation.map(({ label, to, icon: Icon }) => <NavLink key={to} to={to} onClick={() => setDrawerOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon size={18} /><span>{label}</span></NavLink>)}
    </nav>
    <div className="sidebar-bottom"><div className="sidebar-tip"><span className="tip-spark">✳</span><b>Your space, your pace.</b><p>Keep life’s important things in one considered place.</p><Link to="/storage">See storage <span>↗</span></Link></div>
      <NavLink to="/settings" onClick={() => setDrawerOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Settings size={18} /><span>Settings</span></NavLink>
      <a className="nav-item" href="mailto:hello@docvault.example"><CircleHelp size={18} /><span>Help & support</span></a>
    </div>
  </aside>

  return <div className="app-shell">
    {drawerOpen && <button className="drawer-scrim" aria-label="Close navigation" onClick={() => setDrawerOpen(false)} />}
    {sidebar}
    <div className="app-main">
      <header className="topbar">
        <IconButton label="Open navigation" className="menu-trigger" onClick={() => setDrawerOpen(true)}><Menu size={20} /></IconButton>
        <form className="global-search" onSubmit={search}><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your documents" aria-label="Search your documents" /><kbd>⌘ K</kbd></form>
        <div className="topbar-actions"><IconButton label="Notifications" onClick={() => toast('Notifications are not connected to the backend yet.')}><Bell size={18} /><i className="notification-dot" /></IconButton><span className="topbar-divider" /><div className="user-menu-wrap"><button className="user-menu" onClick={() => setMenuOpen((open) => !open)}><span className="avatar">{user?.avatar ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : initials}</span><span className="user-menu-name">{user?.name || ''}</span><ChevronDown size={15} /></button>{menuOpen && <div className="user-dropdown"><div className="dropdown-user"><b>{user?.name}</b><span>{user?.email}</span></div><Link to="/profile" onClick={() => setMenuOpen(false)}>Your profile</Link><Link to="/settings" onClick={() => setMenuOpen(false)}>Account settings</Link><button onClick={async () => { await signOut(); navigate('/'); }}> <LogOut size={15} /> Sign out</button></div>}</div></div>
      </header>
      <main className="page-content">{children}</main>
      <footer className="workspace-footer"><span>DocVault · A calmer place for important things</span><span>Private cloud storage</span></footer>
    </div>
  </div>
}
