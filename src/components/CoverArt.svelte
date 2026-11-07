<script lang="ts">
  import type { Cover } from '../lib/types'
  import { isDark, mix } from '../lib/util'
  import Bow from './Bow.svelte'

  let { cover, title = '' }: { cover: Cover; title?: string } = $props()

  const uid = $props.id()
  const dark = $derived(isDark(cover.color) || cover.color === '#a8435f')
  const deep = $derived(dark ? mix(cover.color, '#ffffff', 0.55) : mix(cover.color, '#7a2f4c', 0.42))
  const soft = $derived(dark ? mix(cover.color, '#ffffff', 0.25) : mix(cover.color, '#ffffff', 0.45))
  const spine = $derived(mix(cover.color, '#000000', 0.12))
  const plate = $derived(dark ? mix(cover.color, '#ffffff', 0.88) : '#fffaf6')
  const plateInk = $derived(dark ? mix(cover.color, '#000000', 0.2) : mix(cover.color, '#5b2c3f', 0.75))

  const heart = 'M0 6 C-9 0 -9 -8 -4.5 -8 C-2 -8 0 -6 0 -4 C0 -6 2 -8 4.5 -8 C9 -8 9 0 0 6 Z'

  function pearls(y0: number, sag: number, n: number) {
    const out: [number, number][] = []
    for (let i = 0; i <= n; i++) {
      const t = i / n
      const x = 24 + t * 276
      const y = y0 + 4 * sag * t * (1 - t)
      out.push([x, y])
    }
    return out
  }
</script>

<svg viewBox="0 0 300 400" class="cover" role="img" aria-label={title ? `Portada: ${title}` : 'Portada'}>
  <defs>
    <linearGradient id="{uid}-shine" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0.28" />
      <stop offset="0.5" stop-color="#fff" stop-opacity="0" />
      <stop offset="1" stop-color="#000" stop-opacity="0.06" />
    </linearGradient>
    <pattern id="{uid}-hearts" width="56" height="56" patternUnits="userSpaceOnUse">
      <path d={heart} transform="translate(14 16) scale(1.1)" fill={deep} opacity="0.55" />
      <path d={heart} transform="translate(42 44) scale(0.8) rotate(-12)" fill={soft} />
    </pattern>
    <pattern id="{uid}-vichy" width="36" height="36" patternUnits="userSpaceOnUse">
      <rect x="0" y="0" width="18" height="36" fill={deep} opacity="0.22" />
      <rect x="0" y="0" width="36" height="18" fill={deep} opacity="0.22" />
    </pattern>
    <pattern id="{uid}-flores" width="80" height="80" patternUnits="userSpaceOnUse">
      {#each [[20, 22, 1], [62, 60, 0.75]] as [fx, fy, fs]}
        <g transform="translate({fx} {fy}) scale({fs})">
          {#each [0, 72, 144, 216, 288] as a}
            <ellipse cx="0" cy="-8" rx="6" ry="8.5" transform="rotate({a})" fill={plate} opacity="0.92" />
          {/each}
          <circle r="4.5" fill={deep} />
        </g>
      {/each}
      <circle cx="58" cy="18" r="2.4" fill={deep} opacity="0.5" />
      <circle cx="18" cy="62" r="2" fill={deep} opacity="0.5" />
    </pattern>
  </defs>

  <rect x="0" y="0" width="300" height="400" rx="16" fill={cover.color} />

  {#if cover.template === 'corazones'}
    <rect x="0" y="0" width="300" height="400" fill="url(#{uid}-hearts)" />
  {:else if cover.template === 'vichy'}
    <rect x="0" y="0" width="300" height="400" fill="url(#{uid}-vichy)" />
    <Bow x={160} y={96} size={120} color={deep} />
  {:else if cover.template === 'flores'}
    <rect x="0" y="0" width="300" height="400" fill="url(#{uid}-flores)" />
  {:else if cover.template === 'mono'}
    <Bow x={160} y={120} size={170} color={deep} />
  {:else if cover.template === 'perlas'}
    {#each [[18, 80, 22], [8, 150, 26]] as [y0, sag, n]}
      <path d="M24 {y0} Q 162 {y0 + sag * 2} 300 {y0}" fill="none" stroke={deep} stroke-width="1.2" opacity="0.4" />
      {#each pearls(y0, sag, n) as [px, py]}
        <circle cx={px} cy={py} r="6.5" fill={plate} />
        <circle cx={px - 2} cy={py - 2} r="2" fill="#fff" opacity="0.9" />
        <circle cx={px} cy={py} r="6.5" fill="none" stroke={deep} stroke-opacity="0.25" />
      {/each}
    {/each}
  {:else if cover.template === 'encaje'}
    {#each [0, 1] as side}
      <g transform={side ? 'translate(0 400) scale(1 -1)' : ''}>
        <rect x="0" y="0" width="300" height="34" fill={plate} opacity="0.9" />
        {#each Array.from({ length: 12 }, (_, i) => 22 + i * 24.5) as cx}
          <circle cx={cx} cy="34" r="12.25" fill={plate} opacity="0.9" />
          <circle cx={cx} cy="36" r="3" fill={cover.color} />
          <circle cx={cx} cy="20" r="2" fill={cover.color} opacity="0.7" />
        {/each}
      </g>
    {/each}
    <Bow x={162} y={86} size={110} color={deep} />
  {/if}

  <!-- Lomo -->
  <rect x="0" y="0" width="24" height="400" rx="16" fill={spine} />
  <rect x="16" y="0" width="8" height="400" fill={spine} />
  <line x1="24" y1="0" x2="24" y2="400" stroke="#000" stroke-opacity="0.08" stroke-width="2" />

  {#if title}
    <g transform="translate(162 262)">
      <rect x="-96" y="-38" width="192" height="76" rx="14" fill={plate} />
      <rect x="-89" y="-31" width="178" height="62" rx="10" fill="none" stroke={deep} stroke-opacity="0.5" stroke-dasharray="4 4" stroke-width="1.5" />
      <text
        x="0"
        y="2"
        text-anchor="middle"
        dominant-baseline="middle"
        font-family="Dancing Script, cursive"
        font-weight="700"
        font-size={title.length > 16 ? 19 : title.length > 11 ? 23 : 28}
        fill={plateInk}>{title.length > 24 ? title.slice(0, 23) + '…' : title}</text
      >
    </g>
  {/if}

  <rect x="0" y="0" width="300" height="400" rx="16" fill="url(#{uid}-shine)" />
</svg>

<style>
  .cover {
    display: block;
    width: 100%;
    height: auto;
  }
</style>
