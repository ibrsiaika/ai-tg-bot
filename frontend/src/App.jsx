import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useSocket } from './hooks/useSocket'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Map from './pages/Map'
import Inventory from './pages/Inventory'
import Systems from './pages/Systems'
import Analytics from './pages/Analytics'
import Commands from './pages/Commands'
import Logs from './pages/Logs'

function App() {
  const { connected, data } = useSocket()

  return (
    <BrowserRouter>
      <Layout connected={connected}>
        <Routes>
          <Route path="/" element={<Dashboard data={data} />} />
          <Route path="/map" element={<Map data={data} />} />
          <Route path="/inventory" element={<Inventory data={data} />} />
          <Route path="/systems" element={<Systems data={data} />} />
          <Route path="/analytics" element={<Analytics data={data} />} />
          <Route path="/commands" element={<Commands />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
