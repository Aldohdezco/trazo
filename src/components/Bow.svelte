<script lang="ts">
  /** Moño decorativo. Se dibuja centrado en (x, y); `size` es el ancho aproximado. */
  let { x = 0, y = 0, size = 120, color = '#d9668a', knot }: { x?: number; y?: number; size?: number; color?: string; knot?: string } = $props()
  const s = $derived(size / 168)
</script>

<g transform="translate({x} {y}) scale({s})">
  <path d="M0 0 C-26 -40 -84 -54 -84 -14 C-84 20 -34 14 0 0 Z" fill={color} />
  <path d="M0 0 C26 -40 84 -54 84 -14 C84 20 34 14 0 0 Z" fill={color} />
  <path d="M-12 -8 C-30 -26 -60 -30 -64 -14" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="5" stroke-linecap="round" />
  <path d="M12 -8 C30 -26 60 -30 64 -14" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="5" stroke-linecap="round" />
  <path d="M-6 6 L-34 70 L-18 64 L-8 78 L6 8 Z" fill={color} />
  <path d="M6 6 L34 70 L18 64 L8 78 L-6 8 Z" fill={color} />
  <ellipse cx="0" cy="2" rx="14" ry="17" fill={knot ?? color} />
  <ellipse cx="0" cy="2" rx="14" ry="17" fill="rgba(0,0,0,0.12)" />
</g>
