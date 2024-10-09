import { useEffect, useRef, useState } from 'react'
import AppRunner from './AppRunner'

function App() {
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // States
  const [cameraConnected, setCameraConnected] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (canvas !== null && video !== null) {
      const app = new AppRunner(canvas, video)
      app.play()

      return () => {
        app.dispose()
      }
    }
  }, [])

  return (
    <>
      <canvas ref={canvasRef} />
      <video autoPlay loop muted playsInline ref={videoRef} src='/fpo.mp4' />
      {!cameraConnected && (
        <button onClick={() => {
          navigator.mediaDevices.getUserMedia({ video: true }).then((value: MediaStream) => {
            if (videoRef.current !== null) {
              videoRef.current.srcObject = value
              setCameraConnected(true)
            }
          })
        }}>Connect Camera</button>
      )}
      <ul>
        <li>Current Frame</li>
        <li>Current Optical Flow</li>
        <li>Previous Frame</li>
        <li>Accumulated Optical Flow</li>
      </ul>
    </>
  )
}

export default App
