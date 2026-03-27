'use client';

import { useEffect, useRef } from 'react';

const vsSource = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

// 真实极光 shader — 竖直光幕 + 绿紫配色
const fsSource = `
  precision highp float;
  uniform vec2 u_resolution;
  uniform float u_time;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = p * 2.0 + vec2(1.7, 9.2);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    float t = u_time * 0.15;

    // ========== 极光主体 — 竖直光幕 ==========
    // 关键：用 uv.y 的噪声影响 uv.x，制造竖直条纹
    
    float aurora = 0.0;
    vec3 auroraColor = vec3(0.0);
    
    // 第一层：左侧绿色光幕
    {
      // 竖直方向的噪声控制光幕的左右摆动
      float curtainNoise = fbm(vec2(uv.y * 4.0 + t * 0.3, t * 0.2));
      // 光幕中心线位置（随噪声左右摆动）
      float curtainCenter = 0.3 + curtainNoise * 0.2;
      // 距离中心线越近越亮
      float dist = abs(uv.x - curtainCenter);
      float curtain = smoothstep(0.15, 0.0, dist);
      // 顶部和底部衰减
      float fadeY = smoothstep(0.0, 0.2, uv.y) * smoothstep(0.7, 0.35, uv.y);
      // 光幕内部的竖直条纹
      float stripes = fbm(vec2(uv.y * 20.0 + t * 0.5, uv.x * 3.0));
      curtain *= (0.5 + stripes * 0.8);
      curtain *= fadeY;
      
      aurora += curtain * 1.5;
      auroraColor += vec3(0.1, 1.0, 0.4) * curtain; // 翠绿
    }
    
    // 第二层：中间偏右的绿色光幕
    {
      float curtainNoise = fbm(vec2(uv.y * 3.0 - t * 0.25, t * 0.15 + 5.0));
      float curtainCenter = 0.5 + curtainNoise * 0.15;
      float dist = abs(uv.x - curtainCenter);
      float curtain = smoothstep(0.12, 0.0, dist);
      float fadeY = smoothstep(0.0, 0.15, uv.y) * smoothstep(0.65, 0.3, uv.y);
      float stripes = fbm(vec2(uv.y * 25.0 + t * 0.4, uv.x * 4.0 + 3.0));
      curtain *= (0.4 + stripes * 0.7);
      curtain *= fadeY;
      
      aurora += curtain * 1.2;
      auroraColor += vec3(0.0, 0.9, 0.5) * curtain; // 青绿
    }
    
    // 第三层：右侧紫色/品红色光幕
    {
      float curtainNoise = fbm(vec2(uv.y * 3.5 + t * 0.35, t * 0.18 + 10.0));
      float curtainCenter = 0.7 + curtainNoise * 0.15;
      float dist = abs(uv.x - curtainCenter);
      float curtain = smoothstep(0.18, 0.0, dist);
      float fadeY = smoothstep(0.0, 0.25, uv.y) * smoothstep(0.75, 0.4, uv.y);
      float stripes = fbm(vec2(uv.y * 18.0 - t * 0.6, uv.x * 2.5 + 7.0));
      curtain *= (0.5 + stripes * 0.6);
      curtain *= fadeY;
      
      aurora += curtain * 1.3;
      auroraColor += vec3(0.7, 0.2, 1.0) * curtain; // 紫色
    }
    
    // 第四层：品红色薄光幕
    {
      float curtainNoise = fbm(vec2(uv.y * 5.0 - t * 0.2, t * 0.12 + 15.0));
      float curtainCenter = 0.65 + curtainNoise * 0.1;
      float dist = abs(uv.x - curtainCenter);
      float curtain = smoothstep(0.08, 0.0, dist);
      float fadeY = smoothstep(0.05, 0.2, uv.y) * smoothstep(0.55, 0.3, uv.y);
      float stripes = fbm(vec2(uv.y * 30.0 + t * 0.3, uv.x * 5.0));
      curtain *= (0.6 + stripes * 0.5);
      curtain *= fadeY;
      
      aurora += curtain * 0.8;
      auroraColor += vec3(1.0, 0.2, 0.6) * curtain; // 品红
    }

    // ========== 地面树木剪影 ==========
    float treeLine = 0.0;
    {
      // 用噪声生成不规则的树线
      float treeNoise1 = fbm(vec2(uv.x * 8.0, 0.0));
      float treeNoise2 = fbm(vec2(uv.x * 15.0 + 100.0, 0.0));
      float treeHeight = 0.08 + treeNoise1 * 0.06 + treeNoise2 * 0.03;
      
      // 尖锐的树冠形状
      float treeTop = treeHeight + noise(vec2(uv.x * 30.0, 0.0)) * 0.03;
      
      if (uv.y < treeTop) {
        treeLine = 1.0;
        // 树冠内部的细节
        float detail = noise(vec2(uv.x * 50.0, uv.y * 100.0));
        treeLine *= (0.7 + detail * 0.3);
      }
    }

    // ========== 星空 ==========
    float stars = 0.0;
    for (float i = 0.0; i < 3.0; i++) {
      vec2 starUV = uv * (120.0 + i * 60.0);
      vec2 starId = floor(starUV);
      float star = step(0.997, hash(starId));
      float twinkle = 0.6 + 0.4 * sin(u_time * (1.0 + hash(starId + vec2(50.0)) * 3.0) + hash(starId) * 6.28);
      stars += star * twinkle;
    }
    // 树线下方不显示星星
    stars *= smoothstep(0.05, 0.15, uv.y);

    // ========== 天空背景 ==========
    vec3 skyTop = vec3(0.01, 0.01, 0.03);
    vec3 skyMid = vec3(0.02, 0.03, 0.06);
    vec3 skyBot = vec3(0.02, 0.01, 0.04);
    vec3 sky = mix(skyBot, skyMid, smoothstep(0.0, 0.3, uv.y));
    sky = mix(sky, skyTop, smoothstep(0.3, 0.8, uv.y));

    // ========== 合成 ==========
    vec3 color = sky;
    color += auroraColor;
    color += vec3(stars) * vec3(0.8, 0.9, 1.0);
    
    // 树木剪影（黑色覆盖）
    color = mix(color, vec3(0.0), treeLine * 0.95);

    // 暗角
    float vig = 1.0 - length((uv - 0.5) * vec2(0.8, 0.6)) * 0.3;
    color *= vig;

    // 色调映射
    color = color / (color + 0.6);
    color = pow(color, vec3(0.85));

    gl_FragColor = vec4(color, 1.0);
  }
`;

export default function AuroraHeroPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    function compileShader(type: number, source: string): WebGLShader | null {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vs = compileShader(gl.VERTEX_SHADER, vsSource);
    const fs = compileShader(gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Link error:', gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, 'u_resolution');
    const uTime = gl.getUniformLocation(program, 'u_time');

    const start = performance.now();
    let raf: number;

    function render() {
      gl!.uniform2f(uRes, canvas!.width, canvas!.height);
      gl!.uniform1f(uTime, (performance.now() - start) / 1000);
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(render);
    }
    render();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', background: '#010108' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, display: 'block' }} />
      <div style={{
        position: 'relative', zIndex: 10,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100%', color: 'white',
        fontFamily: "'Georgia', serif", textAlign: 'center',
        pointerEvents: 'none',
      }}>
        <h1 style={{
          fontSize: 'clamp(2rem, 5vw, 4rem)',
          marginBottom: '1rem',
          textShadow: '0 0 40px rgba(0, 255, 100, 0.3)',
        }}>
          ✨ Aurora Blog
        </h1>
        <p style={{ fontSize: 'clamp(0.9rem, 2vw, 1.3rem)', opacity: 0.6 }}>
          Scroll to explore
        </p>
      </div>
    </div>
  );
}
