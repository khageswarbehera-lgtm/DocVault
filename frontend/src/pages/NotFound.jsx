import { Link } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'

export default function NotFound() {
  return <main className="not-found"><Link className="brand-lockup" to="/"><span className="brand-mark"><ShieldCheck size={21} /></span><span>Doc<span>Vault</span></span></Link><span className="eyebrow">NOTHING TO FILE HERE</span><strong>404</strong><h1>We couldn’t find that page.</h1><p>The address may have changed, or perhaps it was never here.</p><Link className="button button-primary" to="/"><ArrowLeft size={16} /> Back to home</Link></main>
}
