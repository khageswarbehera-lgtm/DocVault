import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/useAuth'
import { getApiErrorMessage } from '../services/api'

const schemas = {
  login: z.object({ email: z.email('Enter a valid email address'), password: z.string().min(1, 'Enter your password') }),
  register: z.object({ name: z.string().min(2, 'Enter your full name'), email: z.email('Enter a valid email address'), password: z.string().min(8, 'Use at least 8 characters'), confirmPassword: z.string() }).refine((values) => values.password === values.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' }),
  forgot: z.object({ email: z.email('Enter a valid email address') }),
}

const content = {
  login: { eyebrow: 'WELCOME BACK', title: 'Good to see you.', description: 'Your important things are right where you left them.', submit: 'Log in', switchText: 'New to DocVault?', switchLabel: 'Create an account' },
  register: { eyebrow: 'MAKE YOURSELF AT HOME', title: 'A place for it all.', description: 'Create your personal space for life’s important documents.', submit: 'Create account', switchText: 'Already have an account?', switchLabel: 'Log in' },
  forgot: { eyebrow: 'A FRESH START', title: 'Let’s get you back in.', description: 'Enter your email and we’ll prepare a reset link for you.', submit: 'Send reset link', switchText: 'Remember your password?', switchLabel: 'Back to log in' },
}

export default function AuthPage({ mode = 'login' }) {
  const [showPassword, setShowPassword] = useState(false)
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const current = content[mode]
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schemas[mode]), defaultValues: { email: '', password: '' } })
  const switchTo = mode === 'register' ? '/login' : mode === 'forgot' ? '/login' : '/register'

  const onSubmit = async (values) => {
    if (mode === 'forgot') {
      toast.error('Password reset is not available because the backend has no reset endpoint yet.')
      return
    }
    try {
      if (mode === 'register') await signUp(values.name, values.email, values.password)
      else await signIn(values.email, values.password)
      toast.success(mode === 'register' ? 'Your account is ready.' : 'Welcome back.')
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true })
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not authenticate. Please try again.'))
    }
  }

  return <div className="auth-page"><aside className="auth-aside"><Link className="brand-lockup" to="/"><span className="brand-mark"><ShieldCheck size={21} /></span><span>Doc<span>Vault</span></span></Link><div className="auth-aside-content"><span className="auth-aside-icon"><Sparkles size={20} /></span><p className="eyebrow">A HOME FOR THE IMPORTANT THINGS</p><h2>Life’s little<br />details, <em>in order.</em></h2><p>Keep the papers that matter close, in a space that feels like yours.</p><div className="auth-aside-line"><span><LockKeyhole size={15} /> Thoughtful by design</span><i>·</i><span>Ready when you are</span></div></div><div className="auth-aside-footer"><span>© 2026 DocVault</span><Link to="/">Learn about DocVault <ArrowRight size={14} /></Link></div><span className="auth-aside-number">01 / 03</span></aside><main className="auth-main"><div className="auth-top-link"><Link to="/"><ArrowLeft size={15} /> Back to home</Link><span>Personal document space</span></div><section className="auth-form-wrap"><div className="auth-form-head"><span className="eyebrow">{current.eyebrow}</span><h1>{current.title}</h1><p>{current.description}</p></div><form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      {mode === 'register' && <label className="field"><span>Full name</span><input autoComplete="name" placeholder="e.g. Maya Chen" {...register('name')} />{errors.name && <small className="field-error">{errors.name.message}</small>}</label>}
      <label className="field"><span>Email address</span><input type="email" autoComplete="email" placeholder="you@example.com" {...register('email')} />{errors.email && <small className="field-error">{errors.email.message}</small>}</label>
      {mode !== 'forgot' && <label className="field"><span>Password</span><span className="password-input"><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'} {...register('password')} /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span>{errors.password && <small className="field-error">{errors.password.message}</small>}</label>}
      {mode === 'register' && <label className="field"><span>Confirm password</span><input type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Enter your password again" {...register('confirmPassword')} />{errors.confirmPassword && <small className="field-error">{errors.confirmPassword.message}</small>}</label>}
      {mode === 'login' && <div className="auth-form-extras"><label className="check-field"><input type="checkbox" defaultChecked /><span>Remember me</span></label><Link to="/forgot-password">Forgot password?</Link></div>}
      <button className="button button-primary auth-submit" type="submit" disabled={isSubmitting}>{current.submit}<ArrowRight size={16} /></button>
    </form><div className="auth-switch">{current.switchText} <Link to={switchTo}>{current.switchLabel}</Link></div><p className="auth-disclaimer"><LockKeyhole size={13} /> Your credentials are sent to the DocVault backend for authentication.</p></section><footer className="auth-main-footer"><span>Made with care for your everyday paperwork.</span><span>Help &nbsp;·&nbsp; Privacy</span></footer></main></div>
}
