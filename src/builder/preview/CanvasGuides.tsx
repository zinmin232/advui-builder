import { useLayoutEffect, useRef } from 'react'

function paintRuler(
  node: HTMLCanvasElement,
  axis: 'x' | 'y',
  origin: number,
  zoom: number,
  theme: 'light' | 'dark',
) {
  const width = node.clientWidth
  const height = node.clientHeight
  if (width === 0 || height === 0) return
  const dpr = window.devicePixelRatio || 1
  const pixelWidth = Math.round(width * dpr)
  const pixelHeight = Math.round(height * dpr)
  if (node.width !== pixelWidth || node.height !== pixelHeight) {
    node.width = pixelWidth
    node.height = pixelHeight
  }
  const ctx = node.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)
  ctx.strokeStyle = theme === 'dark' ? 'rgba(197, 204, 214, 0.9)' : 'rgba(90, 98, 110, 0.85)'
  ctx.fillStyle = theme === 'dark' ? '#c5ccd6' : '#4b5563'
  ctx.font = '10px "Segoe UI", system-ui, sans-serif'
  ctx.lineWidth = 1
  ctx.beginPath()
  if (axis === 'x') {
    ctx.moveTo(0, height - 0.5)
    ctx.lineTo(width, height - 0.5)
  } else {
    ctx.moveTo(width - 0.5, 0)
    ctx.lineTo(width - 0.5, height)
  }
  ctx.stroke()

  const span = axis === 'x' ? width : height
  const step = 10 * zoom >= 8 ? 10 : 50
  const first = Math.floor(-origin / zoom / step) * step
  const last = Math.ceil((span - origin) / zoom / step) * step
  for (let value = first; value <= last; value += step) {
    if (value < 0) continue
    const pos = Math.round(origin + value * zoom) + 0.5
    const labeled = value % 100 === 0
    const major = value % 50 === 0
    ctx.beginPath()
    if (axis === 'x') {
      ctx.moveTo(pos, height)
      ctx.lineTo(pos, labeled ? 2 : major ? 7 : height - 5)
    } else {
      ctx.moveTo(width, pos)
      ctx.lineTo(labeled ? 2 : major ? 8 : width - 5, pos)
    }
    ctx.stroke()
    if (!labeled) continue
    const label = String(value)
    if (axis === 'x') {
      ctx.fillText(label, pos + 3, 11)
    } else {
      ctx.save()
      ctx.translate(3, pos - 2)
      ctx.rotate(-Math.PI / 2)
      ctx.textBaseline = 'top'
      ctx.fillText(label, 0, 0)
      ctx.restore()
    }
  }
}

export function CanvasGuides({
  canvas,
  zoom,
  theme,
}: {
  canvas: HTMLDivElement | null
  zoom: number
  theme: 'light' | 'dark'
}) {
  const xRef = useRef<HTMLCanvasElement>(null)
  const yRef = useRef<HTMLCanvasElement>(null)

  useLayoutEffect(() => {
    const horizontal = xRef.current
    const vertical = yRef.current
    if (!canvas || !horizontal || !vertical) return

    const draw = () => {
      const stage = canvas.querySelector('.stage')
      const canvasRect = canvas.getBoundingClientRect()
      const stageRect = stage?.getBoundingClientRect()
      const originX = stageRect ? stageRect.left - canvasRect.left : 0
      const originY = stageRect ? stageRect.top - canvasRect.top : 0
      paintRuler(horizontal, 'x', originX, zoom, theme)
      paintRuler(vertical, 'y', originY, zoom, theme)
    }

    draw()
    const frame = requestAnimationFrame(draw)
    canvas.addEventListener('scroll', draw, { passive: true })
    const observer = new ResizeObserver(draw)
    observer.observe(canvas)
    observer.observe(horizontal)
    observer.observe(vertical)
    return () => {
      cancelAnimationFrame(frame)
      canvas.removeEventListener('scroll', draw)
      observer.disconnect()
    }
  }, [canvas, zoom, theme])

  return (
    <>
      <div className="ruler-corner" />
      <canvas ref={xRef} className="ruler ruler-x" aria-hidden="true" />
      <canvas ref={yRef} className="ruler ruler-y" aria-hidden="true" />
    </>
  )
}
