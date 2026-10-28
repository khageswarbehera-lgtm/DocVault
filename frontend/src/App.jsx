import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { DocumentsProvider } from './context/DocumentsContext'
import AppRoutes from './routes/AppRoutes'

function App() {
  return <BrowserRouter><AuthProvider><DocumentsProvider><AppRoutes /><Toaster position="bottom-right" toastOptions={{ duration: 3200, style: { border: '1px solid #e7eae6', borderRadius: '10px', fontSize: '13px' } }} /></DocumentsProvider></AuthProvider></BrowserRouter>
}

export default App
