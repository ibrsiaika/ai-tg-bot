import { useState, useEffect } from 'react'
import CameraView from '../components/CameraView'

/**
 * Camera Page - Dedicated full-page view of the bot's camera
 */
export default function CameraPage({ data }) {
  const [cameraData, setCameraData] = useState(null)

  // Fetch camera data (fallback for initial load)
  useEffect(() => {
    const fetchCameraData = async () => {
      try {
        const response = await fetch('/api/camera')
        if (response.ok) {
          const cameraResponse = await response.json()
          setCameraData(cameraResponse)
        }
      } catch (error) {
        console.error('Failed to fetch camera data:', error)
      }
    }

    // Initial load
    fetchCameraData()
  }, [])

  // Listen for real-time camera updates from Socket.IO
  useEffect(() => {
    if (data.camera) {
      setCameraData(data.camera)
    }
  }, [data.camera])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white">Bot Camera</h2>
        <p className="text-slate-400 mt-1">Live view of what your bot sees in the game world</p>
      </div>

      <div className="card">
        <CameraView cameraData={cameraData} />
      </div>
    </div>
  )
}
