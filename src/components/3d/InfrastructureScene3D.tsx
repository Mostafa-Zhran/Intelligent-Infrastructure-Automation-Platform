import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as THREE from 'three';
import { Sparkles, X, Activity, ArrowRight, ShieldCheck } from 'lucide-react';
import { PageId } from '../../types';

interface NodeInfo {
  id: string;
  name: string;
  role: string;
  tagline: string;
  metric: string;
  tech: string;
  color: string;
  iconName: string;
  position: [number, number, number];
  description: string;
  pipelineState: string;
}

const NODES_DATA: NodeInfo[] = [
  {
    id: 'terraform',
    name: 'Terraform Engine',
    role: 'Infrastructure as Code',
    tagline: 'Declarative Multi-Cloud Topology',
    metric: '14 Resources Managed',
    tech: 'HCL · State Locks · Zero Drift',
    color: '#A78BFA',
    iconName: 'Box',
    position: [-3.0, 1.4, 0.4],
    description: 'Generates and enforces reproducible cloud infrastructure blueprints with automatic plan validation and state drift prevention.',
    pipelineState: 'ACTIVE · 100% Synced',
  },
  {
    id: 'k8s',
    name: 'Kubernetes Cluster',
    role: 'Container Orchestration',
    tagline: 'Self-Healing Distributed Pods',
    metric: '12/12 Pods Healthy',
    tech: 'Helm · Ingress · HPA Scaled',
    color: '#34D399',
    iconName: 'Cpu',
    position: [3.1, 1.6, -0.3],
    description: 'Automated namespace isolation, blue/green rollout orchestration, and dynamic horizontal auto-scaling across target nodes.',
    pipelineState: 'READY · Zero Downtime',
  },
  {
    id: 'docker',
    name: 'Container Runtime',
    role: 'Microservice Artifacts',
    tagline: 'Multi-Arch Hermetic Builds',
    metric: '99.4% Cache Hit Rate',
    tech: 'OCI Compliant · BuildKit',
    color: '#38BDF8',
    iconName: 'Container',
    position: [-2.6, -1.8, 0.8],
    description: 'Compiles lightweight production images with multi-stage caching, vulnerability SBOM scanning, and instant registry synchronization.',
    pipelineState: 'BUILT · Signed & Scanned',
  },
  {
    id: 'vault',
    name: 'Zero-Trust Vault',
    role: 'Security & Compliance',
    tagline: 'Ephemeral Identity & Secrets',
    metric: 'mTLS + OIDC Enforced',
    tech: 'AES-256 · SOC2 Type II',
    color: '#FCD34D',
    iconName: 'ShieldCheck',
    position: [2.8, -1.7, 0.6],
    description: 'Rotates secrets continuously, enforces strict least-privilege IAM access policies, and audits every pipeline invocation cryptographically.',
    pipelineState: 'COMPLIANT · 256-bit Encrypted',
  },
  {
    id: 'gateway',
    name: 'Edge Transit Mesh',
    role: 'Global Routing',
    tagline: 'High-Throughput Anycast Gateway',
    metric: '< 18ms Edge Latency',
    tech: 'Cloudflare · AWS · GCP · Azure',
    color: '#C084FC',
    iconName: 'Globe2',
    position: [0.0, 2.7, -0.8],
    description: 'Provides unified multi-cloud ingress with DDoS mitigation, automatic SSL termination, and intelligent geo-proximity routing.',
    pipelineState: 'LIVE · Global Anycast',
  },
];

interface InfrastructureScene3DProps {
  onNavigate: (page: PageId) => void;
}

export const InfrastructureScene3D: React.FC<InfrastructureScene3DProps> = ({ onNavigate }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<NodeInfo | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeInfo | null>(null);
  const [isReducedMotion, setIsReducedMotion] = useState<boolean>(false);
  const [webglSupported, setWebglSupported] = useState<boolean>(true);
  const [isSceneReady, setIsSceneReady] = useState<boolean>(false);

  // Store interactive mesh references for raycasting
  const interactiveMeshesRef = useRef<Map<THREE.Object3D, NodeInfo>>(new Map());

  // Close modal on Escape key and prevent background body scroll when open
  useEffect(() => {
    if (!selectedNode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedNode(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [selectedNode]);

  useEffect(() => {
    // Check reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mediaQuery.matches);
    const motionListener = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    mediaQuery.addEventListener('change', motionListener);

    const container = mountRef.current;
    if (!container) return;

    // Detect WebGL capability
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglSupported(false);
        return;
      }
    } catch {
      setWebglSupported(false);
      return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;

    // ── 1. Scene, Camera, Renderer ──────────────────────────────────────
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x07070D, 0.045);

    const isMobileInit = width < 768;
    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 100);
    camera.position.set(0, isMobileInit ? 0.35 : 0, isMobileInit ? 12.5 : 8.5);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // ── 2. Lighting ─────────────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0x181829, 2.5);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xA78BFA, 3.2);
    mainLight.position.set(6, 8, 5);
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x38BDF8, 2.0);
    fillLight.position.set(-6, -4, 4);
    scene.add(fillLight);

    const coreLight = new THREE.PointLight(0x8B5CF6, 4.0, 12, 1.2);
    coreLight.position.set(0, 0, 0);
    scene.add(coreLight);

    // ── 3. Central Orchestrator Core ────────────────────────────────────
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // Inner glowing sphere
    const coreGeometry = new THREE.IcosahedronGeometry(0.85, 2);
    const coreMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x7C3AED,
      emissive: 0x6D28D9,
      emissiveIntensity: 0.65,
      roughness: 0.25,
      metalness: 0.8,
      wireframe: false,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    coreGroup.add(coreMesh);

    // Outer cyber wireframe cage
    const wireframeGeo = new THREE.IcosahedronGeometry(1.22, 1);
    const wireframeMat = new THREE.MeshBasicMaterial({
      color: 0xA78BFA,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const wireframeMesh = new THREE.Mesh(wireframeGeo, wireframeMat);
    coreGroup.add(wireframeMesh);

    // Orbiting CI/CD Rings
    const ring1Geo = new THREE.TorusGeometry(1.7, 0.022, 16, 100);
    const ring1Mat = new THREE.MeshStandardMaterial({
      color: 0x38BDF8,
      emissive: 0x0284C7,
      emissiveIntensity: 0.7,
      roughness: 0.2,
      metalness: 0.9,
    });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = Math.PI / 3;
    ring1.rotation.y = Math.PI / 6;
    coreGroup.add(ring1);

    const ring2Geo = new THREE.TorusGeometry(2.1, 0.018, 16, 100);
    const ring2Mat = new THREE.MeshStandardMaterial({
      color: 0x8B5CF6,
      emissive: 0x6D28D9,
      emissiveIntensity: 0.6,
      roughness: 0.3,
      metalness: 0.9,
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = -Math.PI / 4;
    ring2.rotation.z = Math.PI / 5;
    coreGroup.add(ring2);

    // ── 4. Floating Infrastructure Nodes ────────────────────────────────
    const nodeMeshes: THREE.Mesh[] = [];
    const interactiveMap = new Map<THREE.Object3D, NodeInfo>();

    NODES_DATA.forEach((info) => {
      const nodeGroup = new THREE.Group();
      nodeGroup.position.set(...info.position);

      let geom: THREE.BufferGeometry;
      switch (info.id) {
        case 'terraform':
          geom = new THREE.OctahedronGeometry(0.55, 0);
          break;
        case 'k8s':
          geom = new THREE.BoxGeometry(0.7, 0.7, 0.7);
          break;
        case 'docker':
          geom = new THREE.CylinderGeometry(0.42, 0.42, 0.65, 8);
          break;
        case 'vault':
          geom = new THREE.DodecahedronGeometry(0.52, 0);
          break;
        case 'gateway':
        default:
          geom = new THREE.TetrahedronGeometry(0.58, 0);
          break;
      }

      const mat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(info.color),
        emissive: new THREE.Color(info.color),
        emissiveIntensity: 0.45,
        roughness: 0.2,
        metalness: 0.75,
        clearcoat: 0.8,
        wireframe: false,
      });

      const mesh = new THREE.Mesh(geom, mat);
      mesh.castShadow = true;
      mesh.userData = { nodeId: info.id, info };
      nodeGroup.add(mesh);

      // Node subtle wire halo
      const haloGeo = new THREE.RingGeometry(0.8, 0.85, 32);
      const haloMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(info.color),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.28,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.lookAt(camera.position);
      nodeGroup.add(halo);

      scene.add(nodeGroup);
      nodeMeshes.push(mesh);
      interactiveMap.set(mesh, info);
    });

    interactiveMeshesRef.current = interactiveMap;

    // ── 5. Pipeline Laser Connection Lines ──────────────────────────────
    const connectionLines: THREE.Line[] = [];
    const pipelineCurvePoints: THREE.Vector3[][] = [];

    NODES_DATA.forEach((node) => {
      const p1 = new THREE.Vector3(0, 0, 0);
      const p2 = new THREE.Vector3(...node.position);
      const mid = new THREE.Vector3()
        .addVectors(p1, p2)
        .multiplyScalar(0.5)
        .add(new THREE.Vector3((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8, 0.4));

      const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
      const pts = curve.getPoints(36);
      pipelineCurvePoints.push(pts);

      const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const lineMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(node.color),
        transparent: true,
        opacity: 0.32,
      });
      const line = new THREE.Line(lineGeo, lineMat);
      scene.add(line);
      connectionLines.push(line);
    });

    // Inter-node pipeline link (Terraform -> Docker -> K8s)
    const tfPos = new THREE.Vector3(...NODES_DATA[0].position);
    const dkPos = new THREE.Vector3(...NODES_DATA[2].position);
    const k8sPos = new THREE.Vector3(...NODES_DATA[1].position);

    const loopCurve = new THREE.CatmullRomCurve3([tfPos, dkPos, k8sPos]);
    const loopGeo = new THREE.BufferGeometry().setFromPoints(loopCurve.getPoints(50));
    const loopMat = new THREE.LineDashedMaterial({
      color: 0x38BDF8,
      dashSize: 0.2,
      gapSize: 0.1,
      transparent: true,
      opacity: 0.4,
    });
    const loopLine = new THREE.Line(loopGeo, loopMat);
    loopLine.computeLineDistances();
    scene.add(loopLine);

    // ── 6. Ambient Particle Field ───────────────────────────────────────
    const particleCount = 750;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    const palette = [
      new THREE.Color('#8B5CF6'),
      new THREE.Color('#38BDF8'),
      new THREE.Color('#34D399'),
      new THREE.Color('#FFFFFF'),
    ];

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      particlePositions[idx] = (Math.random() - 0.5) * 18;
      particlePositions[idx + 1] = (Math.random() - 0.5) * 14;
      particlePositions[idx + 2] = (Math.random() - 0.5) * 10;

      const c = palette[Math.floor(Math.random() * palette.length)];
      particleColors[idx] = c.r;
      particleColors[idx + 1] = c.g;
      particleColors[idx + 2] = c.b;
    }

    const particlesGeo = new THREE.BufferGeometry();
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particlesGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particlesMat = new THREE.PointsMaterial({
      size: 0.055,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particles);

    // ── 7. Mouse & Scroll Interaction Listeners ─────────────────────────
    const mouse = new THREE.Vector2(0, 0);
    const targetCameraOffset = new THREE.Vector2(0, 0);
    const raycaster = new THREE.Raycaster();
    let scrollY = window.scrollY;

    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      mouse.x = x;
      mouse.y = y;

      targetCameraOffset.x = x * 0.75;
      targetCameraOffset.y = y * 0.5;

      // Raycast for hover
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodeMeshes, false);

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        const info = hitMesh.userData.info as NodeInfo;
        setHoveredNode(info);
        container.style.cursor = 'pointer';
      } else {
        setHoveredNode(null);
        container.style.cursor = 'default';
      }
    };

    const handleClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodeMeshes, false);

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        const info = hitMesh.userData.info as NodeInfo;
        setSelectedNode(info);
      }
    };

    const handleScroll = () => {
      scrollY = window.scrollY;
    };

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      const isMobile = w < 768;
      camera.aspect = w / h;
      camera.position.z = isMobile ? 12.5 : 8.5;
      camera.position.y = isMobile ? 0.35 : 0;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const handlePointerDown = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouse.x = x;
      mouse.y = y;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodeMeshes, false);
      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        const info = hitMesh.userData.info as NodeInfo;
        setSelectedNode(info);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    container.addEventListener('mousemove', handlePointerMove);
    container.addEventListener('click', handleClick);
    container.addEventListener('pointerdown', handlePointerDown);

    // ── 8. Visibility & Intersection Observer Optimization ──────────────
    let isVisible = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.1 }
    );
    observer.observe(container);

    // ── 9. Animation Render Loop ────────────────────────────────────────
    let animationFrameId: number;
    let lastTime = performance.now();
    let elapsedTime = 0;

    const animate = (currentTime?: number) => {
      animationFrameId = requestAnimationFrame(animate);

      if (!isVisible || document.hidden) return;

      const now = typeof currentTime === 'number' && !isNaN(currentTime) ? currentTime : performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      elapsedTime += delta;
      const time = elapsedTime;
      const speedFactor = isReducedMotion ? 0.2 : 1.0;

      // Rotate central core
      coreMesh.rotation.y += 0.35 * delta * speedFactor;
      coreMesh.rotation.x += 0.2 * delta * speedFactor;
      wireframeMesh.rotation.y -= 0.25 * delta * speedFactor;
      wireframeMesh.rotation.z += 0.15 * delta * speedFactor;

      ring1.rotation.z += 0.45 * delta * speedFactor;
      ring2.rotation.z -= 0.38 * delta * speedFactor;

      // Rotate and float infrastructure nodes
      nodeMeshes.forEach((mesh, idx) => {
        mesh.rotation.y += 0.4 * delta * speedFactor;
        mesh.rotation.x += 0.25 * delta * speedFactor;

        // Subtle floating bounce
        const info = mesh.userData.info as NodeInfo;
        mesh.parent!.position.y = info.position[1] + Math.sin(time * 1.5 + idx * 1.2) * 0.12 * speedFactor;

        // Hover scale feedback
        const isHovered = hoveredNode?.id === info.id || selectedNode?.id === info.id;
        const targetScale = isHovered ? 1.28 : 1.0;
        mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.12);

        const mat = mesh.material as THREE.MeshPhysicalMaterial;
        const targetEmissive = isHovered ? 0.95 : 0.45;
        mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, targetEmissive, 0.15);
      });

      // Slowly float particle cloud
      particles.rotation.y = time * 0.02 * speedFactor;
      particles.rotation.x = Math.sin(time * 0.015) * 0.05 * speedFactor;

      // Camera parallax interpolation (pointer + scroll dampening)
      const scrollOffset = (scrollY / 400) * 0.8;
      const targetCamX = targetCameraOffset.x * speedFactor;
      const targetCamY = targetCameraOffset.y * speedFactor - scrollOffset;

      camera.position.x += (targetCamX - camera.position.x) * 0.05;
      camera.position.y += (targetCamY - camera.position.y) * 0.05;
      camera.lookAt(0, -scrollOffset * 0.3, 0);

      renderer.render(scene, camera);
    };

    // Pre-warm renderer immediately so first frame shows without waiting for loop ticks
    renderer.render(scene, camera);
    setIsSceneReady(true);

    animate();

    // ── 10. Cleanup ─────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animationFrameId);
      setIsSceneReady(false);
      observer.disconnect();
      mediaQuery.removeEventListener('change', motionListener);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handlePointerMove);
      container.removeEventListener('click', handleClick);
      container.removeEventListener('pointerdown', handlePointerDown);

      // Dispose Geometries and Materials
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Points) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material?.dispose();
          }
        }
      });

      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [isReducedMotion]);

  if (!webglSupported) {
    return null;
  }

  return (
    <div
      style={{ touchAction: 'pan-y' }}
      className="relative w-full h-full min-h-[520px] sm:min-h-[620px] lg:min-h-[700px] overflow-hidden select-none"
    >
      {/* ── Instant Cyber Topology Placeholder (Renders at 0ms so page is NEVER blank) ── */}
      <div
        className={`absolute inset-0 z-0 pointer-events-none transition-opacity duration-1000 ease-out ${
          isSceneReady ? 'opacity-0' : 'opacity-100'
        }`}
        aria-hidden="true"
      >
        {/* Core and node glow blooms */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] sm:w-[480px] h-[380px] sm:h-[480px] rounded-full bg-violet-600/20 blur-[100px] animate-pulse" />
        <div className="absolute top-[32%] left-[22%] -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-violet-500/15 blur-[60px]" />
        <div className="absolute top-[30%] right-[22%] translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-emerald-500/15 blur-[60px]" />
        <div className="absolute bottom-[28%] left-[24%] -translate-x-1/2 translate-y-1/2 w-48 h-48 rounded-full bg-sky-500/15 blur-[60px]" />
        <div className="absolute bottom-[26%] right-[24%] translate-x-1/2 translate-y-1/2 w-48 h-48 rounded-full bg-amber-500/15 blur-[60px]" />

        {/* Lightweight SVG Topology Architecture Wireframe */}
        <svg className="w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#6D28D9" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#07070D" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="tfGrad" x1="50%" y1="50%" x2="22%" y2="34%">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#A78BFA" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="k8sGrad" x1="50%" y1="50%" x2="78%" y2="32%">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#34D399" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="dkGrad" x1="50%" y1="50%" x2="26%" y2="70%">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="vaultGrad" x1="50%" y1="50%" x2="74%" y2="68%">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#FBBF24" stopOpacity="0.4" />
            </linearGradient>
          </defs>

          {/* Connection Cables */}
          <path d="M 500 500 Q 360 400 220 340" fill="none" stroke="url(#tfGrad)" strokeWidth="1.5" strokeDasharray="5 5" opacity="0.6" />
          <path d="M 500 500 Q 640 380 780 320" fill="none" stroke="url(#k8sGrad)" strokeWidth="1.5" strokeDasharray="5 5" opacity="0.6" />
          <path d="M 500 500 Q 380 620 260 700" fill="none" stroke="url(#dkGrad)" strokeWidth="1.5" strokeDasharray="5 5" opacity="0.6" />
          <path d="M 500 500 Q 620 600 740 680" fill="none" stroke="url(#vaultGrad)" strokeWidth="1.5" strokeDasharray="5 5" opacity="0.6" />

          {/* Center Orchestrator */}
          <circle cx="500" cy="500" r="48" fill="url(#coreGlow)" />
          <circle cx="500" cy="500" r="36" fill="none" stroke="#A78BFA" strokeWidth="1.5" opacity="0.6" strokeDasharray="3 3" />
          <circle cx="500" cy="500" r="20" fill="#7C3AED" fillOpacity="0.4" stroke="#C084FC" strokeWidth="2" />

          {/* Node 1: Terraform */}
          <circle cx="220" cy="340" r="22" fill="#A78BFA" fillOpacity="0.12" stroke="#A78BFA" strokeWidth="1.5" />
          <circle cx="220" cy="340" r="10" fill="#A78BFA" fillOpacity="0.7" />

          {/* Node 2: K8s */}
          <circle cx="780" cy="320" r="22" fill="#34D399" fillOpacity="0.12" stroke="#34D399" strokeWidth="1.5" />
          <circle cx="780" cy="320" r="10" fill="#34D399" fillOpacity="0.7" />

          {/* Node 3: Docker */}
          <circle cx="260" cy="700" r="22" fill="#38BDF8" fillOpacity="0.12" stroke="#38BDF8" strokeWidth="1.5" />
          <circle cx="260" cy="700" r="10" fill="#38BDF8" fillOpacity="0.7" />

          {/* Node 4: Vault */}
          <circle cx="740" cy="680" r="22" fill="#FBBF24" fillOpacity="0.12" stroke="#FBBF24" strokeWidth="1.5" />
          <circle cx="740" cy="680" r="10" fill="#FBBF24" fillOpacity="0.7" />
        </svg>
      </div>

      {/* 3D WebGL Canvas Container with smooth entrance cross-fade */}
      <div
        ref={mountRef}
        className={`absolute inset-0 w-full h-full z-0 cursor-default transition-opacity duration-700 ease-out ${
          isSceneReady ? 'opacity-100' : 'opacity-0'
        }`}
        aria-label="Interactive 3D DevOps Infrastructure Visualization"
        role="img"
      />

      {/* Ambient gradient vignettes to blend seamlessly into page background */}
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#07070D] via-[#07070D]/70 to-transparent pointer-events-none z-10" />
      <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#07070D] via-[#07070D]/80 to-transparent pointer-events-none z-10" />
      <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#07070D] to-transparent pointer-events-none z-10" />
      <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#07070D] to-transparent pointer-events-none z-10" />

      {/* ── Top Floating HUD: Controls / Hint ─────────────────────────── */}
      <div
        className={`absolute top-3 sm:top-5 left-1/2 -translate-x-1/2 z-20 pointer-events-none transition-all duration-700 w-[92%] sm:w-auto max-w-sm sm:max-w-none text-center ${
          isSceneReady ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
        }`}
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-white/[0.05] backdrop-blur-md border border-white/10 text-[10px] sm:text-[11px] font-mono text-[#A1A1B5] shadow-lg">
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <span className="status-dot-pulse absolute inline-flex h-full w-full rounded-full bg-cyan-400" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
          </span>
          <span className="hidden sm:inline">Interactive 3D Topology · Move mouse to rotate · Tap nodes to inspect</span>
          <span className="sm:hidden">Interactive 3D · Tap nodes to inspect</span>
        </div>
      </div>

      {/* ── Bottom Right: Active Hover HUD Badge ──────────────────────── */}
      {hoveredNode && !selectedNode && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 z-20 animate-scaleIn pointer-events-none">
          <div
            className="p-3.5 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-center gap-3.5 max-w-sm"
            style={{
              background: 'rgba(10, 10, 18, 0.94)',
              borderColor: hoveredNode.color,
              boxShadow: `0 16px 40px -8px rgba(0,0,0,0.8), 0 0 20px -4px ${hoveredNode.color}40`,
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-md flex-shrink-0"
              style={{
                background: `${hoveredNode.color}20`,
                border: `1px solid ${hoveredNode.color}60`,
                color: hoveredNode.color,
              }}
            >
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white tracking-tight truncate">
                  {hoveredNode.name}
                </h4>
                <span
                  className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded-full"
                  style={{
                    color: hoveredNode.color,
                    background: `${hoveredNode.color}20`,
                    border: `1px solid ${hoveredNode.color}40`,
                  }}
                >
                  {hoveredNode.role}
                </span>
              </div>
              <p className="text-xs text-[#A1A1B5] truncate mt-0.5 font-mono">
                {hoveredNode.metric}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Center / Modal: Selected Node Detailed Inspection Card (Rendered via Portal) ────── */}
      {selectedNode &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="node-modal-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedNode(null);
            }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-[#07070D]/85 backdrop-blur-xl animate-fadeIn"
          >
            <div
              className="w-full sm:max-w-lg p-5 sm:p-8 rounded-t-3xl sm:rounded-3xl border border-b-0 sm:border-b shadow-2xl relative animate-slideUp sm:animate-scaleIn max-h-[88vh] overflow-y-auto"
              style={{
                background: 'linear-gradient(180deg, #121222 0%, #0B0B14 100%)',
                borderColor: `${selectedNode.color}70`,
                boxShadow: `0 24px 64px -16px rgba(0,0,0,0.9), 0 0 40px -10px ${selectedNode.color}60`,
              }}
            >
              {/* Mobile bottom-sheet drag handle */}
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-4 sm:hidden" />
              {/* Top specular glow line */}
              <div
                className="absolute inset-x-0 top-0 h-[2px] rounded-t-3xl"
                style={{ background: `linear-gradient(90deg, transparent, ${selectedNode.color}, transparent)` }}
              />

              {/* Close button */}
              <button
                type="button"
                onClick={() => setSelectedNode(null)}
                className="absolute top-4 right-4 w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white/50 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                aria-label="Close details"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              {/* Header */}
              <div className="flex items-start gap-4 mb-5">
                <div
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0"
                  style={{
                    background: `${selectedNode.color}25`,
                    border: `1px solid ${selectedNode.color}70`,
                    color: selectedNode.color,
                  }}
                >
                  <Activity className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <div className="min-w-0 pr-6">
                  <span
                    className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider font-semibold px-2.5 py-0.5 rounded-full inline-block mb-1.5"
                    style={{
                      color: selectedNode.color,
                      background: `${selectedNode.color}20`,
                      border: `1px solid ${selectedNode.color}45`,
                    }}
                  >
                    {selectedNode.role}
                  </span>
                  <h3 id="node-modal-title" className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {selectedNode.name}
                  </h3>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm sm:text-base text-[#D4D4E8] leading-relaxed mb-6">
                {selectedNode.description}
              </p>

              {/* Technical Metrics Panel */}
              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2.5 mb-6 text-xs sm:text-sm font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-[#A1A1B5]">Active Metric:</span>
                  <span className="text-white font-semibold">{selectedNode.metric}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#A1A1B5]">Architecture:</span>
                  <span className="text-cyan-300 font-semibold">{selectedNode.tech}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#A1A1B5]">Pipeline Status:</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    {selectedNode.pipelineState}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedNode(null);
                    onNavigate('signin');
                  }}
                  className="flex-1 min-h-[46px] px-5 py-2.5 rounded-xl text-white font-semibold text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 hover:brightness-110"
                  style={{
                    background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
                    border: '1px solid rgba(139,92,246,0.5)',
                  }}
                >
                  <span>Launch in Console</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedNode(null)}
                  className="px-5 py-2.5 min-h-[46px] rounded-xl text-sm font-medium text-gray-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
