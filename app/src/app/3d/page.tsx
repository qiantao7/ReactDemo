'use client';

import { useEffect, useRef } from 'react';

interface AuroraHeroProps {
  title?: string;
  subtitle?: string;
}

interface MousePos {
  x: number;
  y: number;
}

const vertexShaderSource = `
  attribute vec2 a_position;
  void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

const fragmentShaderSource = `
  precision highp float;
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform vec2 u_mouse;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 6; i++) {
      v += a * noise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec2 p = uv * 3.0;
    float t = u_time * 0.15;

    // 极光带 1 - 绿色
    float w1 = fbm(vec2(p.x * 1.5 + t * 0.3, p.y * 0.8 + t * 0.1));
    float b1 = 1.0 - smoothstep(0.0, 0.15, abs(uv.y - 0.15 - w1 * 0.12));
    b1 *= smoothstep(0.0, 0.3, uv.y) * smoothstep(0.5, 0.3, uv.y);

    // 极光带 2 - 紫色
    float w2 = fbm(vec2(p.x * 2.0 - t * 0.2, p.y * 1.2 + t * 0.15));
    float b2 = 1.0 - smoothstep(0.0, 0.12, abs(uv.y - 0.2 - w2 * 0.1));
    b2 *= smoothstep(0.0, 0.35, uv.y) * smoothstep(0.5, 0.35, uv.y);

    // 极光带 3 - 青色
    float w3 = fbm(vec2(p.x * 1.0 + t * 0.4, p.y * 0.6 - t * 0.08));
    float b3 = 1.0 - smoothstep(0.0, 0.18, abs(uv.y - 0.1 + w3 * 0.08));
    b3 *= smoothstep(0.0, 0.25, uv.y) * smoothstep(0.45, 0.25, uv.y);

    // 颜色定义
    vec3 green  = vec3(0.0, 1.0, 0.53);
    vec3 cyan   = vec3(0.0, 0.9, 1.0);
    vec3 purple = vec3(0.48, 0.38, 1.0);
    vec3 pink   = vec3(1.0, 0.42, 0.62);

    // 颜色混合
    vec3 c1 = mix(green, cyan, w1 + 0.5 + u_mouse.x * 0.3);
    vec3 c2 = mix(purple, pink, w2 + 0.5);
    vec3 c3 = mix(cyan, green, w3 + 0.5 - u_mouse.x * 0.3);

    vec3 aurora = c1 * b1 * 0.5 + c2 * b2 * 0.35 + c3 * b3 * 0.25;

    // 星空
    float stars = 0.0;
    for (float i = 0.0; i < 3.0; i++) {
      vec2 suv = uv * (200.0 + i * 100.0);
      float s = step(0.998, hash(floor(suv)));
      s *= 0.5 + 0.5 * sin(u_time * 2.0 + hash(floor(suv)) * 6.28);
      stars += s * 0.5;
    }

    // 天空背景
    vec3 sky = mix(vec3(0.05, 0.03, 0.1), vec3(0.02, 0.02, 0.08), uv.y);
    float horizonGlow = exp(-abs(uv.y - 0.02) * 15.0) * 0.15;
    sky += vec3(0.1, 0.05, 0.15) * horizonGlow;

    // 合成
    vec3 col = sky + aurora + vec3(stars);
    col *= 1.0 - length((uv - 0.5) * vec2(1.2, 0.8)) * 0.5;
    col = col / (col + 1.0);
    gl_FragColor = vec4(col, 1.0);
  }
`;

function createShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(
  gl: WebGLRenderingContext,
  vs: WebGLShader,
  fs: WebGLShader
): WebGLProgram | null {
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

export default function AuroraHeroPage({
  title = '✨ Aurora Blog',
  subtitle = 'Scroll to explore',
}: AuroraHeroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<MousePos>({ x: 0.5, y: 0.5 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }

    // Resize
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    // Mouse tracking
    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX / window.innerWidth;
      mouseRef.current.y = 1.0 - e.clientY / window.innerHeight;
    };
    document.addEventListener('mousemove', onMouseMove);

    // Shaders
    const vs = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vs || !fs) return;

    const program = createProgram(gl, vs, fs);
    if (!program) return;
    gl.useProgram(program);

    // Fullscreen quad
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Uniforms
    const uRes = gl.getUniformLocation(program, 'u_resolution');
    const uTime = gl.getUniformLocation(program, 'u_time');
    const uMouse = gl.getUniformLocation(program, 'u_mouse');

    const startTime = Date.now();

    // Render loop
    const render = () => {
      const time = (Date.now() - startTime) / 1000;
      gl!.uniform2f(uRes, canvas!.width, canvas!.height);
      gl!.uniform1f(uTime, time);
      gl!.uniform2f(uMouse, mouseRef.current.x, mouseRef.current.y);
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
      rafRef.current = requestAnimationFrame(render);
    };
    render();

    // Cleanup
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      document.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full"
      />
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center text-white">
        <h1 className="text-5xl md:text-6xl font-serif mb-4 drop-shadow-[0_0_30px_rgba(0,229,255,0.5)]">
          {title}
        </h1>
        <p className="text-lg md:text-xl opacity-80">{subtitle}</p>
      </div>
    </div>
  );
}
