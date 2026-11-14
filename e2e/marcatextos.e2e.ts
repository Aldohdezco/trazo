import { expect, test, type Page } from '@playwright/test'

async function drag(page: Page, pts: [number, number][]) {
  await page.mouse.move(pts[0][0], pts[0][1])
  await page.mouse.down()
  for (const [x, y] of pts.slice(1)) await page.mouse.move(x, y, { steps: 3 })
  await page.mouse.up()
}

function elements(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{ type: string; tool?: string; shape?: string; points?: number[]; size?: number; highlights?: { style?: string }[] }[]>((res) => {
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
  await page.getByRole('button', { name: 'Nuevo cuaderno' }).click()
  await page.getByRole('button', { name: 'Crear cuaderno' }).click()
  await page.getByRole('button', { name: 'Nueva nota' }).click()
  await page.getByRole('button', { name: 'Crear nota' }).click()
  return (await page.locator('.stage').boundingBox())!
}

test('marcatextos mágico: fondo, subrayado, marco y contorno sobre letra a mano', async ({ page }, info) => {
  const b = await newNote(page)
  const at = (x: number, y: number): [number, number] => [b.x + x, b.y + y]

  // Cuatro renglones de "letra a mano"
  const rows = [150, 250, 350, 450]
  for (const y0 of rows) await drag(page, Array.from({ length: 36 }, (_, i) => at(120 + i * 6, y0 + Math.sin(i * 0.9) * 13 + (i % 9 === 0 ? -20 : 0))))

  await page.getByRole('button', { name: 'Marcatextos mágico' }).click()
  for (const [i, mode] of ['Fondo', 'Subrayar', 'Marco', 'Contorno de letras'].entries()) {
    await page.getByRole('radio', { name: mode }).click()
    await drag(page, Array.from({ length: 30 }, (_, k) => at(110 + k * 8, rows[i] - 4 + Math.sin(k * 0.6) * 8)))
  }
  await page.waitForTimeout(600)
  await page.screenshot({ path: info.outputPath('1-modos.png') })

  const els = await elements(page)
  expect(els.filter((e) => e.type === 'line')).toHaveLength(1)
  expect(els.filter((e) => e.type === 'shape' && e.shape === 'redondeado')).toHaveLength(1)
  // La franja de fondo va antes (detrás) de su renglón
  expect(els[0]).toMatchObject({ type: 'stroke', tool: 'marcador' })
  // Contorno: un halo (marcador) por la letra del cuarto renglón
  expect(els.filter((e) => e.type === 'stroke' && e.tool === 'marcador')).toHaveLength(2)
})

test('marcatextos mágico sobre texto: los modos conviven', async ({ page }, info) => {
  const b = await newNote(page)
  await page.getByRole('button', { name: 'Texto', exact: true }).click()
  await page.mouse.click(b.x + 120, b.y + 200)
  await page.keyboard.type('Fotosíntesis y respiración')
  await page.getByRole('button', { name: 'Listo' }).click()
  await page.getByRole('button', { name: 'Marcatextos mágico' }).click()
  await page.getByRole('radio', { name: 'Fondo' }).click()
  await drag(page, [[b.x + 115, b.y + 200], [b.x + 260, b.y + 202]])
  await page.getByRole('radio', { name: 'Subrayar' }).click()
  await drag(page, [[b.x + 115, b.y + 202], [b.x + 400, b.y + 200]])
  await page.getByRole('radio', { name: 'Contorno de letras' }).click()
  await drag(page, [[b.x + 300, b.y + 200], [b.x + 440, b.y + 201]])
  await page.waitForTimeout(500)
  await page.screenshot({ path: info.outputPath('1-texto.png') })
  const [text] = (await elements(page)).filter((e) => e.type === 'text')
  expect(new Set(text.highlights!.map((h) => h.style ?? 'fondo'))).toEqual(new Set(['fondo', 'subrayado', 'contorno']))
})

test('estuche de lápices: todos dibujan', async ({ page }, info) => {
  const b = await newNote(page)
  await page.getByRole('button', { name: 'Lápices' }).click()
  const pens = ['Pluma', 'Pluma fina', 'Lápiz', 'Crayón', 'Pincel', 'Caligrafía', 'Acuarela', 'Neón', 'Brillitos']
  for (const [i, name] of pens.entries()) {
    await page.getByRole('radio', { name, exact: true }).click()
    await drag(page, Array.from({ length: 24 }, (_, k) => [b.x + 120 + k * 16, b.y + 70 + i * 55 + Math.sin(k * 0.5) * 14] as [number, number]))
  }
  await page.waitForTimeout(500)
  await page.screenshot({ path: info.outputPath('1-lapices.png') })
  const tools = (await elements(page)).map((e) => e.tool)
  expect(tools).toEqual(['pluma', 'fino', 'lapiz', 'crayon', 'pincel', 'caligrafia', 'acuarela', 'neon', 'brillos'])
  // El botón del estuche recuerda el último lápiz
  await page.getByRole('button', { name: 'Borrador' }).click()
  await page.getByRole('button', { name: 'Lápices' }).click()
  await expect(page.getByRole('radio', { name: 'Brillitos' })).toHaveAttribute('aria-checked', 'true')
})

test('lápiz mágico con letra fija: todo se convierte en cursiva', async ({ page }) => {
  await page.route('https://generativelanguage.googleapis.com/**', async (route) => {
    if (route.request().method() === 'GET')
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ models: [{ name: 'models/gemini-flash-latest', supportedGenerationMethods: ['generateContent'] }] }) })
    // La IA dice "molde", pero ella eligió Cursiva: gana su elección.
    const body = { candidates: [{ content: { parts: [{ text: '{"texto":"hola","estilo":"molde"}' }] } }] }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  })
  await page.goto('./')
  await page.getByRole('button', { name: 'Ajustes' }).click()
  await page.getByRole('button', { name: /Gemini/ }).click()
  await page.getByLabel('Llave de Gemini (API key)').fill('k')
  await page.getByLabel('Llave de Gemini (API key)').blur()
  await page.getByRole('button', { name: 'Cerrar' }).click()
  await page.getByRole('button', { name: 'Nuevo cuaderno' }).click()
  await page.getByRole('button', { name: 'Crear cuaderno' }).click()
  await page.getByRole('button', { name: 'Nueva nota' }).click()
  await page.getByRole('button', { name: 'Crear nota' }).click()
  const b = (await page.locator('.stage').boundingBox())!
  await page.getByRole('button', { name: 'Lápiz mágico' }).click()
  await page.getByRole('combobox', { name: 'Letra del lápiz mágico' }).selectOption({ label: 'Cursiva' })
  await drag(page, Array.from({ length: 12 }, (_, i) => [b.x + 150 + i * 15, b.y + 200 + (i % 2) * 25] as [number, number]))
  await expect.poll(async () => (await elements(page)).find((e) => e.type === 'text')).toMatchObject({ text: 'hola', font: 'dancing' })
})
