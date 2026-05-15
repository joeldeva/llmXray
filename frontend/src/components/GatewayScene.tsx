import { useEffect, useRef } from 'react'
import * as THREE from 'three'

type PktType = 'clean' | 'pii' | 'secret'

interface PktData {
  x: number
  lane: number
  z: number
  speed: number
  type: PktType
  passedGate: boolean
  deflectOriginY: number
}

export function GatewayScene() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let renderer!: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      return
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)

    const scene = new THREE.Scene()

    const getSize = (): { w: number; h: number } => ({
      w: el.clientWidth || 600,
      h: el.clientHeight || 480,
    })

    const { w, h } = getSize()
    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100)
    camera.position.set(0, 1, 8)
    camera.lookAt(0, 0, 0)

    renderer.setSize(w, h)
    renderer.domElement.style.cssText =
      'position:absolute;top:0;left:0;width:100%;height:100%;'
    el.appendChild(renderer.domElement)

    // ── Starfield ─────────────────────────────────────────────────
    {
      const geo = new THREE.BufferGeometry()
      const pos = new Float32Array(300 * 3)
      for (let i = 0; i < 300; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 30
        pos[i * 3 + 1] = (Math.random() - 0.5) * 18
        pos[i * 3 + 2] = -5 - Math.random() * 4
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      scene.add(
        new THREE.Points(
          geo,
          new THREE.PointsMaterial({ size: 0.04, color: '#1a3050', sizeAttenuation: true }),
        ),
      )
    }

    // ── Scanner Gate ──────────────────────────────────────────────
    const gateGroup = new THREE.Group()
    scene.add(gateGroup)

    // Outer wireframe frame
    {
      const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(0.5, 4.0, 0.22))
      gateGroup.add(
        new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: '#0369a1' })),
      )
    }

    // Vertical pillars
    {
      const geo = new THREE.BoxGeometry(0.04, 4.0, 0.04)
      const mat = new THREE.MeshBasicMaterial({ color: '#0369a1' })
      for (const px of [-0.25, 0.25]) {
        const p = new THREE.Mesh(geo, mat)
        p.position.x = px
        gateGroup.add(p)
      }
    }

    // Inner cyan ring
    const scanRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.9, 0.018, 8, 40),
      new THREE.MeshBasicMaterial({ color: '#06b6d4', transparent: true, opacity: 0.82 }),
    )
    gateGroup.add(scanRing)

    // Outer octagonal ring
    const outerRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.65, 0.012, 8, 8),
      new THREE.MeshBasicMaterial({ color: '#0284c7', transparent: true, opacity: 0.38 }),
    )
    gateGroup.add(outerRing)

    // Middle ring
    const midRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.22, 0.01, 6, 32),
      new THREE.MeshBasicMaterial({ color: '#0ea5e9', transparent: true, opacity: 0.3 }),
    )
    gateGroup.add(midRing)

    // Scan beam (horizontal plane sweeping vertically)
    const scanBeam = new THREE.Mesh(
      new THREE.PlaneGeometry(0.48, 0.07),
      new THREE.MeshBasicMaterial({ color: '#22d3ee', transparent: true, opacity: 0.92 }),
    )
    gateGroup.add(scanBeam)

    // Corner marker dots
    {
      const geo = new THREE.SphereGeometry(0.055, 8, 8)
      const mat = new THREE.MeshBasicMaterial({ color: '#06b6d4' })
      const corners: Array<[number, number]> = [
        [-0.25, 2.0],
        [0.25, 2.0],
        [-0.25, -2.0],
        [0.25, -2.0],
      ]
      for (const [cx, cy] of corners) {
        const dot = new THREE.Mesh(geo, mat)
        dot.position.set(cx, cy, 0)
        gateGroup.add(dot)
      }
    }

    // Horizontal cross-bars
    {
      const geo = new THREE.BoxGeometry(0.55, 0.03, 0.03)
      const mat = new THREE.MeshBasicMaterial({ color: '#0369a1' })
      for (const py of [2.0, -2.0]) {
        const bar = new THREE.Mesh(geo, mat)
        bar.position.y = py
        gateGroup.add(bar)
      }
    }

    // ── Ground Grid ───────────────────────────────────────────────
    {
      const grid = new THREE.GridHelper(22, 22, '#0a1e30', '#0a1e30')
      grid.position.y = -2.5
      scene.add(grid)
    }

    // ── Packets ───────────────────────────────────────────────────
    const LANES = [-1.1, 0, 1.1]
    const N = 24

    const pkts: PktData[] = Array.from({ length: N }, (_, i) => {
      const laneIdx = i % 3
      const roll = i % 9
      const type: PktType = roll < 5 ? 'clean' : roll < 7 ? 'pii' : 'secret'
      return {
        x: -9 + (i / N) * 18,
        lane: LANES[laneIdx],
        z: (Math.floor(i / 9) - 1) * 0.85,
        speed: 0.032 + laneIdx * 0.005,
        type,
        passedGate: false,
        deflectOriginY: LANES[laneIdx],
      }
    })

    const pktMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.26, 0.1, 0.12),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
      N,
    )
    pktMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    scene.add(pktMesh)

    const COL = {
      cyan: new THREE.Color('#06b6d4'),
      green: new THREE.Color('#10b981'),
      yellow: new THREE.Color('#f59e0b'),
      red: new THREE.Color('#ef4444'),
    }

    for (let i = 0; i < N; i++) pktMesh.setColorAt(i, COL.cyan)
    if (pktMesh.instanceColor) pktMesh.instanceColor.needsUpdate = true

    // ── Mouse parallax ────────────────────────────────────────────
    const mouse = { x: 0, y: 0 }
    const onMouseMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect()
      mouse.x = ((e.clientX - r.left) / r.width - 0.5) * 2
      mouse.y = -((e.clientY - r.top) / r.height - 0.5) * 2
    }
    el.addEventListener('mousemove', onMouseMove)

    // ── Animation loop ────────────────────────────────────────────
    const dummy = new THREE.Object3D()
    let raf = 0
    let t = 0

    const tick = () => {
      raf = requestAnimationFrame(tick)
      t += 0.016

      // Beam sweeps up and down inside gate
      scanBeam.position.y = Math.sin(t * 1.55) * 1.75

      // Rings rotate
      scanRing.rotation.z = t * 0.48
      outerRing.rotation.z = -t * 0.18
      midRing.rotation.z = t * 0.3

      // Packet movement
      pkts.forEach((p, i) => {
        p.x += p.speed
        if (p.x > 9) {
          p.x = -9
          p.passedGate = false
          p.deflectOriginY = p.lane
        }

        let y = p.lane
        if (p.x > 0.4) {
          if (!p.passedGate) {
            p.passedGate = true
            p.deflectOriginY = p.lane
          }
          const d = p.x - 0.4
          if (p.type === 'secret') {
            // Deflect downward — blocked
            y = p.deflectOriginY - d * 0.65
          } else if (p.type === 'pii') {
            // Slight wave — warn
            y = p.deflectOriginY + Math.sin(d * 1.4) * 0.14
          }
          // clean: straight through at lane y
        }

        dummy.position.set(p.x, y, p.z)
        dummy.updateMatrix()
        pktMesh.setMatrixAt(i, dummy.matrix)

        const col =
          p.x > 0.4
            ? p.type === 'secret'
              ? COL.red
              : p.type === 'pii'
                ? COL.yellow
                : COL.green
            : COL.cyan
        pktMesh.setColorAt(i, col)
      })

      pktMesh.instanceMatrix.needsUpdate = true
      if (pktMesh.instanceColor) pktMesh.instanceColor.needsUpdate = true

      // Camera subtly follows mouse
      camera.position.x += (mouse.x * 0.65 - camera.position.x) * 0.024
      camera.position.y += (mouse.y * 0.42 + 1.0 - camera.position.y) * 0.024
      camera.lookAt(0, 0, 0)

      renderer.render(scene, camera)
    }
    tick()

    // ── Resize ────────────────────────────────────────────────────
    const onResize = () => {
      const { w: rw, h: rh } = getSize()
      renderer.setSize(rw, rh)
      camera.aspect = rw / rh
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(onResize)
    ro.observe(el)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      el.removeEventListener('mousemove', onMouseMove)
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', height: '100%', minHeight: '460px' }}
      role="img"
      aria-label="Animated 3D visualization of AI traffic flowing through LlmXray security gateway"
    />
  )
}
