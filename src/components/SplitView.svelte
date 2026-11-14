<script lang="ts">
  import type { El } from '../lib/types'
  import Editor from './Editor.svelte'

  let { a, b }: { a: string; b: string } = $props()

  const SPLIT_KEY = 'trazo:division'
  let active = $state<'a' | 'b'>('a')
  let fraction = $state(readFraction())
  let root: HTMLDivElement
  let left = $state<ReturnType<typeof Editor> | null>(null)
  let right = $state<ReturnType<typeof Editor> | null>(null)
  let vertical = $state(window.innerWidth >= window.innerHeight)

  function readFraction(): number {
    try {
      const v = Number(localStorage.getItem(SPLIT_KEY))
      return v > 0.2 && v < 0.8 ? v : 0.5
    } catch {
      return 0.5
    }
  }

  function onResize() {
    vertical = window.innerWidth >= window.innerHeight
  }

  function dragDivider(e: PointerEvent) {
    const handle = e.currentTarget as HTMLElement
    handle.setPointerCapture(e.pointerId)
    const move = (ev: PointerEvent) => {
      const r = root.getBoundingClientRect()
      const f = vertical ? (ev.clientX - r.left) / r.width : (ev.clientY - r.top) / r.height
      fraction = Math.min(0.8, Math.max(0.2, f))
    }
    const up = () => {
      handle.removeEventListener('pointermove', move)
      handle.removeEventListener('pointerup', up)
      try {
        localStorage.setItem(SPLIT_KEY, String(fraction))
      } catch {
        /* sin almacenamiento */
      }
    }
    handle.addEventListener('pointermove', move)
    handle.addEventListener('pointerup', up)
  }
</script>

<svelte:window onresize={onResize} />

<div class="split" class:vertical bind:this={root} style="--f:{fraction}">
  <div class="side" class:active={active === 'a'}>
    {#key a}
      <Editor bind:this={left} id={a} pane="a" active={active === 'a'} onactivate={() => (active = 'a')} onsend={(els: El[]) => right?.receive(els)} />
    {/key}
  </div>
  <div class="divider" role="separator" aria-label="Mover división" aria-orientation={vertical ? 'vertical' : 'horizontal'} onpointerdown={dragDivider}>
    <span></span>
  </div>
  <div class="side" class:active={active === 'b'}>
    {#key b}
      <Editor bind:this={right} id={b} pane="b" active={active === 'b'} onactivate={() => (active = 'b')} onsend={(els: El[]) => left?.receive(els)} />
    {/key}
  </div>
</div>

<style>
  .split {
    height: 100%;
    display: grid;
    grid-template-rows: calc(var(--f) * 100% - 7px) 14px 1fr;
    background: var(--line);
  }

  .split.vertical {
    grid-template-rows: none;
    grid-template-columns: calc(var(--f) * 100% - 7px) 14px 1fr;
  }

  .side {
    position: relative;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
  }

  .side.active::after {
    content: '';
    position: absolute;
    inset: 0;
    border: 2.5px solid var(--accent);
    pointer-events: none;
    z-index: 20;
  }

  .divider {
    display: grid;
    place-items: center;
    background: var(--surface-2);
    cursor: row-resize;
    touch-action: none;
  }

  .vertical .divider {
    cursor: col-resize;
  }

  .divider span {
    width: 44px;
    height: 5px;
    border-radius: 999px;
    background: var(--line-strong);
  }

  .vertical .divider span {
    width: 5px;
    height: 44px;
  }
</style>
