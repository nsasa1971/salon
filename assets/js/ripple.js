'use strict';

/**
 * Real-time water-ripple distortion over a background texture.
 * Simulates a height field (encoded into an 8-bit RGBA texture, no float-texture
 * extension required) with a discrete wave equation, then refracts the background
 * texture lookup by the height field's gradient — the classic "water surface" look.
 */
class RippleCanvas {
  constructor(canvas, { resolution = 300, damping = 0.985, refraction = 0.006 } = {}) {
    this.canvas = canvas;
    this.resolution = resolution;
    this.damping = damping;
    this.refraction = refraction;
    this.pendingDrops = [];
    this.supported = false;

    const gl =
      canvas.getContext('webgl', { alpha: false, antialias: false, preserveDrawingBuffer: false }) ||
      canvas.getContext('experimental-webgl', { alpha: false, antialias: false });
    if (!gl) return;
    this.gl = gl;

    // A lost context (GPU reset, memory pressure, driver hiccup, or a canvas
    // left off-screen for a while — real hardware can do this even mid-session,
    // not just at startup) wipes every GL resource. Deliberately DON'T stop the
    // render loop here: GL calls silently no-op per spec while the context is
    // lost, so it's safe to keep looping, and a canvas that's still actively
    // requesting frames is what gives the browser a reason to restore it rather
    // than leave it shelved — stopping outright would remove that signal and
    // leave recovery hostage to `webglcontextrestored` firing on its own.
    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      this.supported = false;
    });
    canvas.addEventListener('webglcontextrestored', () => {
      try {
        this._initGeometry();
        this._initPrograms();
        this._initSimBuffers();
        this._initBackgroundTexture();
        this.supported = true;
        this.resize();
        if (this._lastBackground) this.setBackground(this._lastBackground);
      } catch (err) {
        this.supported = false;
      }
    });

    try {
      this._initGeometry();
      this._initPrograms();
      this._initSimBuffers();
      this._initBackgroundTexture();
      this.supported = true;
    } catch (err) {
      this.supported = false;
    }

    if (this.supported) this.resize();
  }

  _compileShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(info);
    }
    return shader;
  }

  _createProgram(vsSource, fsSource) {
    const gl = this.gl;
    const vs = this._compileShader(gl.VERTEX_SHADER, vsSource);
    const fs = this._compileShader(gl.FRAGMENT_SHADER, fsSource);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program));
    }
    const uniforms = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const rawName = gl.getActiveUniform(program, i).name;
      const name = rawName.endsWith('[0]') ? rawName.slice(0, -3) : rawName;
      uniforms[name] = gl.getUniformLocation(program, name);
    }
    return { program, uniforms };
  }

  _initGeometry() {
    const gl = this.gl;
    this.quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );
  }

  _initPrograms() {
    const vertexSource = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const codec = `
      float decode(float c) { return c * 2.0 - 1.0; }
      float encode(float v) { return clamp(v * 0.5 + 0.5, 0.0, 1.0); }
    `;

    const updateFs = `
      precision highp float;
      uniform sampler2D u_texture;
      uniform vec2 u_delta;
      uniform float u_damping;
      varying vec2 v_uv;
      ${codec}
      void main() {
        vec4 data = texture2D(u_texture, v_uv);
        float height = decode(data.r);
        float vel = decode(data.g);

        vec2 dx = vec2(u_delta.x, 0.0);
        vec2 dy = vec2(0.0, u_delta.y);
        float hL = decode(texture2D(u_texture, v_uv - dx).r);
        float hR = decode(texture2D(u_texture, v_uv + dx).r);
        float hD = decode(texture2D(u_texture, v_uv - dy).r);
        float hU = decode(texture2D(u_texture, v_uv + dy).r);
        float average = (hL + hR + hD + hU) * 0.25;

        vel += (average - height) * 2.0;
        vel *= u_damping;
        height += vel;

        gl_FragColor = vec4(encode(height), encode(vel), 0.0, 1.0);
      }
    `;

    const dropFs = `
      precision highp float;
      #define MAX_DROPS 4
      uniform sampler2D u_texture;
      uniform vec2 u_centers[MAX_DROPS];
      uniform float u_radii[MAX_DROPS];
      uniform float u_strengths[MAX_DROPS];
      uniform float u_aspect;
      varying vec2 v_uv;
      ${codec}
      void main() {
        vec4 data = texture2D(u_texture, v_uv);
        float height = decode(data.r);
        for (int i = 0; i < MAX_DROPS; i++) {
          vec2 diff = v_uv - u_centers[i];
          diff.x *= u_aspect;
          float dist = length(diff);
          float falloff = 1.0 - smoothstep(0.0, max(u_radii[i], 0.0001), dist);
          falloff *= falloff;
          height += falloff * u_strengths[i];
        }
        gl_FragColor = vec4(encode(height), data.g, 0.0, 1.0);
      }
    `;

    const renderFs = `
      precision highp float;
      uniform sampler2D u_heightTexture;
      uniform sampler2D u_backgroundTexture;
      uniform vec2 u_delta;
      uniform float u_refraction;
      varying vec2 v_uv;
      ${codec}
      void main() {
        vec2 dx = vec2(u_delta.x, 0.0);
        vec2 dy = vec2(0.0, u_delta.y);
        float hL = decode(texture2D(u_heightTexture, v_uv - dx).r);
        float hR = decode(texture2D(u_heightTexture, v_uv + dx).r);
        float hD = decode(texture2D(u_heightTexture, v_uv - dy).r);
        float hU = decode(texture2D(u_heightTexture, v_uv + dy).r);
        // Central-difference derivative: divide by the sample spacing so the
        // gradient represents an actual slope, not a texel-to-texel delta
        // that shrinks as simulation resolution increases.
        vec2 grad = vec2(hR - hL, hU - hD) / (2.0 * u_delta);

        vec2 uv = clamp(v_uv + grad * u_refraction, 0.001, 0.999);
        vec3 color = texture2D(u_backgroundTexture, uv).rgb;
        float highlight = clamp((grad.x - grad.y) * 1.2, -1.0, 1.0) * 0.12;
        gl_FragColor = vec4(color + highlight, 1.0);
      }
    `;

    this.updateProgram = this._createProgram(vertexSource, updateFs);
    this.dropProgram = this._createProgram(vertexSource, dropFs);
    this.renderProgram = this._createProgram(vertexSource, renderFs);
  }

  _createSimTexture() {
    const gl = this.gl;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      this.resolution,
      this.resolution,
      0,
      gl.RGBA,
      this.simType,
      null
    );
    return texture;
  }

  _buildSimBuffers() {
    const gl = this.gl;
    const buffers = [0, 1, 2].map(() => {
      const texture = this._createSimTexture();
      const framebuffer = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      return { texture, framebuffer };
    });

    const complete = buffers.every(({ framebuffer }) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      return gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    });

    if (!complete) {
      buffers.forEach(({ texture, framebuffer }) => {
        gl.deleteTexture(texture);
        gl.deleteFramebuffer(framebuffer);
      });
      return null;
    }

    gl.viewport(0, 0, this.resolution, this.resolution);
    buffers.forEach(({ framebuffer }) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.clearColor(0.5, 0.5, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    });
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return buffers;
  }

  /**
   * The wave equation is iterative and self-referencing (each step reads the
   * previous step's output), so 8-bit precision quickly shows as visible
   * quantization noise/speckle. Prefer float, then half-float, and only fall
   * back to 8-bit (still functional, just softer-looking) if neither renders.
   */
  _initSimBuffers() {
    const gl = this.gl;
    const halfFloatExt = gl.getExtension('OES_texture_half_float');
    const candidates = [
      gl.getExtension('OES_texture_float') ? gl.FLOAT : null,
      halfFloatExt ? halfFloatExt.HALF_FLOAT_OES : null,
      gl.UNSIGNED_BYTE,
    ].filter((type) => type !== null);

    for (const type of candidates) {
      this.simType = type;
      const buffers = this._buildSimBuffers();
      if (buffers) {
        this.simBuffers = buffers;
        this.simIndex = 0;
        return;
      }
    }

    throw new Error('No renderable simulation texture format available');
  }

  _initBackgroundTexture() {
    const gl = this.gl;
    this.backgroundTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.backgroundTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([20, 10, 12, 255]));
  }

  setBackground(source) {
    this._lastBackground = source;
    if (!this.supported) return;
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.backgroundTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  }

  drop(x, y, radius = 0.06, strength = 0.5) {
    if (!this.supported) return;
    this.pendingDrops.push({ x, y, radius, strength });
  }

  resize() {
    if (!this.supported) return;
    const { canvas, gl } = this;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  _drawQuad(programInfo) {
    const gl = this.gl;
    gl.useProgram(programInfo.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    const loc = gl.getAttribLocation(programInfo.program, 'a_position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  _step() {
    const gl = this.gl;
    const delta = 1 / this.resolution;
    gl.viewport(0, 0, this.resolution, this.resolution);

    const src = this.simIndex;
    const dst = (src + 1) % 3;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.simBuffers[dst].framebuffer);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.simBuffers[src].texture);
    gl.useProgram(this.updateProgram.program);
    gl.uniform1i(this.updateProgram.uniforms.u_texture, 0);
    gl.uniform2f(this.updateProgram.uniforms.u_delta, delta, delta);
    gl.uniform1f(this.updateProgram.uniforms.u_damping, this.damping);
    this._drawQuad(this.updateProgram);

    if (this.pendingDrops.length) {
      const MAX_DROPS = 4;
      const batch = this.pendingDrops.splice(0, MAX_DROPS);
      const centers = new Float32Array(MAX_DROPS * 2);
      const radii = new Float32Array(MAX_DROPS);
      const strengths = new Float32Array(MAX_DROPS);
      batch.forEach((drop, i) => {
        centers[i * 2] = drop.x;
        centers[i * 2 + 1] = drop.y;
        radii[i] = drop.radius;
        strengths[i] = drop.strength;
      });

      const dst2 = (src + 2) % 3;
      const aspect = this.canvas.clientWidth / Math.max(1, this.canvas.clientHeight);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.simBuffers[dst2].framebuffer);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.simBuffers[dst].texture);
      gl.useProgram(this.dropProgram.program);
      gl.uniform1i(this.dropProgram.uniforms.u_texture, 0);
      gl.uniform1f(this.dropProgram.uniforms.u_aspect, aspect);
      gl.uniform2fv(this.dropProgram.uniforms.u_centers, centers);
      gl.uniform1fv(this.dropProgram.uniforms.u_radii, radii);
      gl.uniform1fv(this.dropProgram.uniforms.u_strengths, strengths);
      this._drawQuad(this.dropProgram);

      this.simIndex = dst2;
    } else {
      this.simIndex = dst;
    }
  }

  _render() {
    const gl = this.gl;
    const delta = 1 / this.resolution;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.simBuffers[this.simIndex].texture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.backgroundTexture);

    gl.useProgram(this.renderProgram.program);
    gl.uniform1i(this.renderProgram.uniforms.u_heightTexture, 0);
    gl.uniform1i(this.renderProgram.uniforms.u_backgroundTexture, 1);
    gl.uniform2f(this.renderProgram.uniforms.u_delta, delta, delta);
    gl.uniform1f(this.renderProgram.uniforms.u_refraction, this.refraction);
    this._drawQuad(this.renderProgram);
  }

  start() {
    if (this._running) return;
    this._running = true;
    const loop = () => {
      if (!this._running) return;
      if (this.supported) {
        this._step();
        this._render();
      }
      this._raf = requestAnimationFrame(loop);
    };
    loop();
  }

  stop() {
    this._running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
  }
}

window.RippleCanvas = RippleCanvas;
