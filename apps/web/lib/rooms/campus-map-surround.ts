import { campusGridProjection } from "@/lib/rooms/campus-grid-projection";
import type { CustomLayerInterface, Map as MapLibreMap } from "maplibre-gl";

const themes = new WeakMap<MapLibreMap, { dark: boolean }>();

export function setCampusSurroundTheme(map: MapLibreMap, dark: boolean) {
  const theme = themes.get(map);
  if (theme) {
    theme.dark = dark;
    map.triggerRepaint();
  }
}

const vertexSource = `#version 300 es
in vec2 position;
uniform mat3 matrix;
out vec3 point;
void main() {
  point = matrix * vec3(position, 1.0);
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const fragmentSource = `#version 300 es
precision highp float;
in vec3 point;
uniform float dark;
out vec4 colour;
float grid(vec2 uv, float divisions) {
  vec2 cell = uv * divisions;
  vec2 width = max(fwidth(cell), vec2(0.00001));
  vec2 distance = abs(fract(cell + 0.5) - 0.5) / width;
  vec2 lines = (1.0 - smoothstep(vec2(0.35), vec2(1.1), distance))
    * (1.0 - smoothstep(vec2(0.0125), vec2(0.05), width));
  return max(lines.x, lines.y);
}
void main() {
  vec3 background = mix(vec3(247.0, 243.0, 239.0) / 255.0, vec3(19.0, 23.0, 28.0) / 255.0, dark);
  colour = vec4(background, 1.0);
  if (point.z <= 0.0) return;
  vec2 uv = point.xy / point.z;
  if (uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) discard;
  float lines = grid(uv, 16.0) * 0.20;
  for (int level = 1; level <= 6; level++) {
    lines = max(lines, grid(uv, 16.0 * exp2(float(level))) * 0.10);
  }
  float fade = exp(-length(max(max(-uv, uv - 1.0), 0.0)) * 0.65);
  vec3 ink = mix(vec3(0.62), vec3(0.38), dark);
  colour = vec4(mix(background, ink, lines * fade), 1.0);
}`;

function mercatorY(latitude: number) {
  const angle = (latitude * Math.PI) / 180;
  return (1 - Math.log(Math.tan(Math.PI / 4 + angle / 2)) / Math.PI) / 2;
}

export function addCampusSurround(
  map: MapLibreMap,
  bounds: readonly [number, number, number, number],
) {
  const [west, south, east, north] = bounds;
  const origin = [(west + 180) / 360, mercatorY(north)];
  const size = [(east - west) / 360, mercatorY(south) - origin[1]];
  const theme = { dark: false };
  themes.set(map, theme);
  let program: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;
  let vao: WebGLVertexArrayObject | null = null;
  let uniforms: Record<string, WebGLUniformLocation | null> = {};

  const layer: CustomLayerInterface = {
    id: "coursemap-surround-grid",
    type: "custom",
    renderingMode: "2d",
    onAdd(_map, gl) {
      program = gl.createProgram();
      if (!program)
        throw new Error("The campus surround could not be created.");
      for (const [kind, source] of [
        [gl.VERTEX_SHADER, vertexSource],
        [gl.FRAGMENT_SHADER, fragmentSource],
      ] as const) {
        const shader = gl.createShader(kind);
        if (!shader)
          throw new Error("The campus surround shader could not be created.");
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          const message = gl.getShaderInfoLog(shader);
          gl.deleteShader(shader);
          throw new Error(`The campus surround shader failed: ${message}`);
        }
        gl.attachShader(program, shader);
        gl.deleteShader(shader);
      }
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw new Error("The campus surround shader could not be linked.");
      uniforms = Object.fromEntries(
        ["matrix", "dark"].map((name) => [
          name,
          gl.getUniformLocation(program!, name),
        ]),
      );
      vao = gl.createVertexArray();
      buffer = gl.createBuffer();
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
        gl.STATIC_DRAW,
      );
      const location = gl.getAttribLocation(program, "position");
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
      gl.bindVertexArray(null);
    },
    render(gl, { defaultProjectionData }) {
      if (!program) return;
      const matrix = campusGridProjection(
        defaultProjectionData.mainMatrix,
        origin,
        size,
      );
      gl.useProgram(program);
      gl.uniformMatrix3fv(uniforms.matrix, false, matrix);
      gl.uniform1f(uniforms.dark, theme.dark ? 1 : 0);
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.bindVertexArray(null);
    },
    onRemove(_map, gl) {
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
      themes.delete(map);
    },
  };
  map.addLayer(layer);
}
