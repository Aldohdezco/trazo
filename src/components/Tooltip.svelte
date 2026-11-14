<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { app } from '../lib/app.svelte'
  import { tipFor, type Tip } from '../lib/tips'

  const SHOW_DELAY = 450
  const LONG_PRESS = 480

  let tip = $state<Tip | null>(null)
  let pos = $state({ x: 0, y: 0, below: false })
  let box = $state<HTMLDivElement | null>(null)
  let timer: ReturnType<typeof setTimeout> | undefined
  let hideTimer: ReturnType<typeof setTimeout> | undefined
  let target: Element | null = null
  let swallowClick = false

  function tipTarget(e: Event): Element | null {
    const el = (e.target as Element | null)?.closest?.('button, select, [role="radio"], [role="tab"]')
    return el && tipFor(el) ? el : null
  }

  function place(el: Element) {
    const r = el.getBoundingClientRect()
    const below = r.top < 130
    pos = { x: r.left + r.width / 2, y: below ? r.bottom + 10 : r.top - 10, below }
  }

  function show(el: Element) {
    if (!app.settings.ayudas) return
    const t = tipFor(el)
    if (!t) return
    // Sin la ayuda nativa del navegador encima de la nuestra.
    const title = el.getAttribute('title')
    if (title) {
      el.setAttribute('data-tip-title', title)
      el.removeAttribute('title')
    }
    target = el
    tip = t
    place(el)
  }

  function hide() {
    clearTimeout(timer)
    tip = null
    target = null
  }

  // Mouse o lápiz que flota sobre la pantalla
  function onOver(e: PointerEvent) {
    if (e.pointerType === 'touch') return
    const el = tipTarget(e)
    if (el === target) return
    clearTimeout(timer)
    if (!el) return hide()
    if (tip) show(el) // ya había un globito: cambia al instante
    else timer = setTimeout(() => show(el), SHOW_DELAY)
  }

  // Dedo o lápiz genérico: dejar presionado
  function onDown(e: PointerEvent) {
    clearTimeout(timer)
    clearTimeout(hideTimer)
    if (e.pointerType === 'mouse') return hide()
    const el = tipTarget(e)
    if (!el) return hide()
    const isTouchLike = e.pointerType === 'touch' || (e.pointerType === 'pen' && !matchMedia('(hover: hover)').matches)
    if (!isTouchLike) return hide()
    timer = setTimeout(() => {
      show(el)
      swallowClick = true
    }, LONG_PRESS)
  }

  function onUp() {
    clearTimeout(timer)
    if (tip && swallowClick) hideTimer = setTimeout(hide, 1800)
  }

  // Después de mostrar la ayuda con un toque largo, ese toque no activa el botón.
  function onClick(e: MouseEvent) {
    if (!swallowClick) return
    swallowClick = false
    e.preventDefault()
    e.stopPropagation()
  }

  const opts = { capture: true } as const
  onMount(() => {
    document.addEventListener('pointerover', onOver, opts)
    document.addEventListener('pointerdown', onDown, opts)
    document.addEventListener('pointerup', onUp, opts)
    document.addEventListener('pointercancel', onUp, opts)
    document.addEventListener('click', onClick, opts)
    window.addEventListener('scroll', hide, opts)
    document.addEventListener('contextmenu', (e) => {
      if (tipTarget(e)) e.preventDefault()
    })
  })
  onDestroy(() => {
    document.removeEventListener('pointerover', onOver, opts)
    document.removeEventListener('pointerdown', onDown, opts)
    document.removeEventListener('pointerup', onUp, opts)
    document.removeEventListener('pointercancel', onUp, opts)
    document.removeEventListener('click', onClick, opts)
    window.removeEventListener('scroll', hide, opts)
  })

  // Que no se salga de la pantalla por los lados
  const left = $derived.by(() => {
    const w = box?.offsetWidth ?? 260
    return Math.min(Math.max(pos.x - w / 2, 8), window.innerWidth - w - 8)
  })
</script>

{#if tip}
  <div
    bind:this={box}
    class="tip"
    class:below={pos.below}
    role="tooltip"
    style="left:{left}px;top:{pos.y}px;--arrow:{pos.x - left}px"
  >
    <strong>{tip.name}</strong>
    {#if tip.desc}<span>{tip.desc}</span>{/if}
  </div>
{/if}

<style>
  .tip {
    position: fixed;
    z-index: 200;
    max-width: 270px;
    display: grid;
    gap: 3px;
    padding: 10px 14px 11px;
    border-radius: 16px;
    background: var(--text);
    color: var(--bg);
    box-shadow: var(--shadow-lg);
    transform: translateY(-100%);
    pointer-events: none;
    animation: pop 0.14s ease;
    font-size: 14px;
    line-height: 1.35;
  }

  .tip.below {
    transform: none;
  }

  .tip::after {
    content: '';
    position: absolute;
    left: calc(var(--arrow) - 6px);
    bottom: -6px;
    width: 12px;
    height: 12px;
    background: inherit;
    transform: rotate(45deg);
    border-radius: 2px;
  }

  .tip.below::after {
    bottom: auto;
    top: -6px;
  }

  strong {
    font-size: 15px;
    color: var(--accent-soft);
  }

  @keyframes pop {
    from {
      opacity: 0;
    }
  }
</style>
