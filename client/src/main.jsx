import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { RoomProvider } from './context/RoomContext'

createRoot(document.getElementById('root')).render(
  <RoomProvider>
    <App />
  </RoomProvider>
)