<script lang="ts">
  import { drawPaper } from '../lib/canvas/background'
  import type { Background } from '../lib/types'

  let { bg, width = 90, height = 116, zoom = 0.45 }: { bg: Background; width?: number; height?: number; zoom?: number } = $props()
  let canvas: HTMLCanvasElement

  $effect(() => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = width * dpr
    canvas.height = height * dpr
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawPaper(ctx, bg, { x: bg.paper === 'semanal' || bg.paper === 'cornell' ? 0 : 6, y: 6, zoom: bg.paper === 'semanal' || bg.paper === 'cornell' ? width / 816 : zoom }, width, height)
  })
</script>

<canvas bind:this={canvas} style="width:{width}px;height:{height}px"></canvas>

<style>
  canvas {
    display: block;
    border-radius: 10px;
  }
</style>
