import { expect, test, type Page } from '@playwright/test'

async function drag(page: Page, pts: [number, number][]) {
  await page.mouse.move(pts[0][0], pts[0][1])
  await page.mouse.down()
  for (const [x, y] of pts.slice(1)) await page.mouse.move(x, y, { steps: 3 })
  await page.mouse.up()
}

type Item = { id: string; type: string; tool?: string; color?: string; size?: number; ring?: number; width?: number; w?: number }

function elements(page: Page) {
  return page.evaluate(
    () =>
      new Promise<Item[]>((res) => {
        const req = indexedDB.open('trazo')
        req.onsuccess = () => {
          const tx = req.result.transaction('contents').objectStore('contents').getAll()
          tx.onsuccess = () => res(tx.result.flatMap((c: { elements: [] }) => c.elements))
        }
      }),
  )
}

async function newNote(page: Page) {
  await page.goto('./')
  await page.getByRole('button', { name: 'Nota rápida' }).click()
  return (await page.locator('.stage').boundingBox())!
}

const wavy = (x: number, y: number) => Array.from({ length: 36 }, (_, i) => [x + i * 6, y + Math.sin(i * 0.9) * 13] as [number, number])

test('lo que hace el marcatextos queda seleccionado: color y grosor al momento', async ({ page }, info) => {
  const b = await newNote(page)
  await drag(page, wavy(b.x + 120, b.y + 200))
  await page.getByRole('button', { name: 'Marcatextos mágico' }).click()
  await page.getByRole('radio', { name: 'Contorno sin fondo', exact: true }).click()
  await drag(page, Array.from({ length: 30 }, (_, k) => [b.x + 110 + k * 8, b.y + 196] as [number, number]))
  const bar = page.getByRole('toolbar', { name: 'Acciones de la selección' })
  await expect(bar).toBeVisible()
  await expect.poll(async () => (await elements(page)).some((e) => e.ring)).toBe(true)
  const ring0 = (await elements(page)).find((e) => e.ring)!
  await bar.getByRole('button', { name: 'Más grueso' }).click()
  await expect.poll(async () => (await elements(page)).find((e) => e.ring)!.ring).toBeGreaterThan(ring0.ring!)
  await bar.getByRole('button', { name: 'Cambiar color' }).click()
  await bar.locator('button').nth(7).click()
  await expect.poll(async () => (await elements(page)).find((e) => e.ring)!.color).not.toBe(ring0.color)
  await page.screenshot({ path: info.outputPath('1-seleccionado.png') })
  // Seguir escribiendo con un lápiz suelta la selección
  await page.getByRole('button', { name: 'Lápices' }).click()
  await drag(page, wavy(b.x + 500, b.y + 400))
  await expect(bar).toBeHidden()
})

test('doble toque con un lápiz selecciona y al soltar vuelve al lápiz', async ({ page }) => {
  const b = await newNote(page)
  await page.getByRole('button', { name: 'Lápices' }).click()
  await drag(page, [[b.x + 100, b.y + 200], [b.x + 300, b.y + 260]])
  await expect.poll(async () => (await elements(page)).length).toBe(1)
  const x = b.x + 200
  const y = b.y + 230
  await page.mouse.click(x, y)
  await page.mouse.click(x, y)
  await expect(page.getByRole('toolbar', { name: 'Acciones de la selección' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Lazo' })).toHaveAttribute('aria-pressed', 'true')
  await page.waitForTimeout(700)
  expect(await elements(page)).toHaveLength(1) // sin puntitos de más
  // Tocar el vacío suelta y regresa al lápiz
  await page.mouse.click(b.x + 600, b.y + 500)
  await expect(page.getByRole('toolbar', { name: 'Acciones de la selección' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Lápices' })).toHaveAttribute('aria-pressed', 'true')
})

test('ajustes por secciones y paletas de color', async ({ page }, info) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Ajustes' }).click()
  await page.getByRole('tab', { name: /Apariencia/ }).click()
  await page.getByRole('button', { name: 'Lila' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'lila')
  await page.screenshot({ path: info.outputPath('1-apariencia.png') })
  await page.getByRole('tab', { name: /Lápiz y gestos/ }).click()
  await expect(page.getByText('Doble toque para seleccionar')).toBeVisible()
  await page.screenshot({ path: info.outputPath('2-lapiz.png') })
  await page.getByRole('tab', { name: /Apariencia/ }).click()
  await page.getByRole('button', { name: /Oscuro/ }).click()
  await page.screenshot({ path: info.outputPath('3-oscuro.png') })
  await page.getByRole('button', { name: 'Cerrar' }).click()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'lila')
  await page.screenshot({ path: info.outputPath('4-estante.png') })
})

test('con el resaltado seleccionado, la barra de abajo lo cambia', async ({ page }, info) => {
  const b = await newNote(page)
  await drag(page, wavy(b.x + 120, b.y + 200))
  await page.getByRole('button', { name: 'Marcatextos mágico' }).click()
  await page.getByRole('radio', { name: 'Contorno sin fondo', exact: true }).click()
  await drag(page, Array.from({ length: 30 }, (_, k) => [b.x + 110 + k * 8, b.y + 196] as [number, number]))
  await expect(page.getByRole('toolbar', { name: 'Acciones de la selección' })).toBeVisible()
  await expect.poll(async () => (await elements(page)).some((e) => e.ring)).toBe(true)
  const r0 = (await elements(page)).find((e) => e.ring)!

  // Color desde la barra de abajo
  await page.getByRole('radiogroup', { name: 'Color del marcatextos' }).getByRole('radio').nth(8).click()
  await expect.poll(async () => (await elements(page)).find((e) => e.ring)?.color).not.toBe(r0.color)
  // Grosor desde el deslizador
  await page.locator('input[type=range]').first().fill('50')
  await expect.poll(async () => (await elements(page)).find((e) => e.ring)?.ring).toBeGreaterThan(r0.ring!)
  // Modo: pasa a fondo
  await page.getByRole('radio', { name: 'Fondo', exact: true }).click()
  await expect.poll(async () => (await elements(page)).filter((e) => e.ring).length).toBe(0)
  expect((await elements(page)).filter((e) => e.type === 'stroke')).toHaveLength(2)
  await page.screenshot({ path: info.outputPath('1-cambiado.png') })
  // Sigue seleccionado y deshacer regresa en pocos pasos
  await expect(page.getByRole('toolbar', { name: 'Acciones de la selección' })).toBeVisible()
})

test('texto: al agrandar la letra no se parte el renglón y el ancho se puede cambiar', async ({ page }, info) => {
  const b = await newNote(page)
  await page.getByRole('button', { name: 'Texto', exact: true }).click()
  await page.mouse.click(b.x + 120, b.y + 200)
  await page.keyboard.type('Tarea de biología')
  await page.getByRole('button', { name: 'Listo' }).click()
  await expect.poll(async () => (await elements(page)).filter((e) => e.type === 'text').length).toBe(1)
  const w0 = (await elements(page)).find((e) => e.type === 'text')!.w!
  // Editar y agrandar la letra
  await page.mouse.click(b.x + 140, b.y + 200)
  await expect(page.getByRole('textbox', { name: 'Texto' })).toBeVisible()
  const h1 = (await page.getByRole('textbox', { name: 'Texto' }).boundingBox())!.height
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Letra más grande' }).click()
  const box = (await page.getByRole('textbox', { name: 'Texto' }).boundingBox())!
  // Un solo renglón: la altura crece en proporción a la letra, no al doble de renglones
  expect(box.height).toBeLessThan(h1 * 2.3)
  // Arrastrar la agarradera del ancho
  const handle = (await page.getByRole('button', { name: 'Ancho del texto' }).boundingBox())!
  await drag(page, [[handle.x + handle.width / 2, handle.y + handle.height / 2], [handle.x + 140, handle.y + handle.height / 2]])
  await page.screenshot({ path: info.outputPath('1-texto.png') })
  await page.getByRole('button', { name: 'Listo' }).click()
  await expect.poll(async () => (await elements(page)).find((e) => e.type === 'text')!.w!).toBeGreaterThan(w0 * 1.6)
})
