'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

function createSpriteTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, canvas.width / 2);
  gradient.addColorStop(0.0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.2, 'rgba(255,255,255,0.9)');
  gradient.addColorStop(0.4, 'rgba(64,160,255,0.35)');
  gradient.addColorStop(1.0, 'rgba(0,0,0,0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export default function PointsSpritesPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(60, 1, 1, 2000);
    camera.position.z = 320;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight, false);
    container.appendChild(renderer.domElement);

    const sprite = createSpriteTexture();

    const particles = 10000;
    const positions = new Float32Array(particles * 3);
    const colors = new Float32Array(particles * 3);

    const color = new THREE.Color();
    for (let i = 0; i < particles; i++) {
      const i3 = i * 3;

      positions[i3 + 0] = (Math.random() * 2 - 1) * 500;
      positions[i3 + 1] = (Math.random() * 2 - 1) * 500;
      positions[i3 + 2] = (Math.random() * 2 - 1) * 500;

      const h = (0.55 + Math.random() * 0.25) % 1;
      const s = 0.65 + Math.random() * 0.35;
      const l = 0.45 + Math.random() * 0.35;
      color.setHSL(h, s, l);
      colors[i3 + 0] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 14,
      sizeAttenuation: true,
      map: sprite ?? undefined,
      transparent: true,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    let mouseX = 0;
    let mouseY = 0;

    const onPointerMove = (event: PointerEvent) => {
      const halfX = window.innerWidth / 2;
      const halfY = window.innerHeight / 2;
      mouseX = (event.clientX - halfX) * 0.08;
      mouseY = (event.clientY - halfY) * 0.08;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    const onResize = () => {
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height, false);
    };
    window.addEventListener('resize', onResize);
    onResize();

    const start = performance.now();
    let raf = 0;

    const animate = () => {
      const elapsed = (performance.now() - start) / 1000;

      camera.position.x += (mouseX - camera.position.x) * 0.02;
      camera.position.y += (-mouseY - camera.position.y) * 0.02;
      camera.lookAt(0, 0, 0);

      points.rotation.y = elapsed * 0.18;
      points.rotation.x = elapsed * 0.08;

      renderer.render(scene, camera);
      raf = window.requestAnimationFrame(animate);
    };
    raf = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointerMove);

      geometry.dispose();
      material.dispose();
      if (sprite) sprite.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        overflow: 'hidden',
      }}
    />
  );
}
