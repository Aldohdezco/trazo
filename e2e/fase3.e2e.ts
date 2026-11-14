import { expect, test, type Page } from '@playwright/test'

async function drag(page: Page, pts: [number, number][]) {
  await page.mouse.move(pts[0][0], pts[0][1])
  await page.mouse.down()
  for (const [x, y] of pts.slice(1)) await page.mouse.move(x, y, { steps: 6 })
  await page.mouse.up()
}

async function newNote(page: Page, notebook = 'Diario') {
  await page.goto('./')
  await page.getByRole('button', { name: 'Nuevo cuaderno' }).click()
  await page.getByPlaceholder('Mi cuaderno').fill(notebook)
  await page.getByRole('button', { name: 'Crear cuaderno' }).click()
  await page.getByRole('button', { name: 'Nueva nota' }).click()
  await page.getByRole('button', { name: 'Crear nota' }).click()
  return (await page.locator('.stage').boundingBox())!
}

function contents(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{ type: string; [k: string]: unknown }[]>((res) => {
        const req = indexedDB.open('trazo')
        req.onsuccess = () => {
          const tx = req.result.transaction('contents').objectStore('contents').getAll()
          tx.onsuccess = () => res(tx.result.flatMap((c: { elements: [] }) => c.elements))
        }
      }),
  )
}

test('stickers: pegar uno incluido y guardar uno propio con borde', async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  const box = await newNote(page)
  const at = (x: number, y: number): [number, number] => [box.x + x, box.y + y]

  // Sticker incluido
  await page.getByRole('button', { name: 'Stickers' }).click()
  await page.getByRole('tab', { name: 'Moños' }).click()
  await page.screenshot({ path: info.outputPath('1-biblioteca.png') })
  await page.getByRole('button', { name: 'Moño rosa' }).click()
  await page.getByRole('button', { name: 'Stickers' }).click()
  await page.getByRole('tab', { name: 'Washi' }).click()
  await page.getByRole('button', { name: 'Washi vichy' }).click()

  // Dibujo un corazón y lo guardo como sticker
  await page.getByRole('button', { name: 'Lápices' }).click()
  await page.getByRole('radio', { name: 'Pincel', exact: true }).click()
  await drag(page, [at(150, 450), at(110, 410), at(130, 380), at(150, 400), at(170, 380), at(190, 410), at(150, 450)])
  await page.getByRole('button', { name: 'Lazo' }).click()
  await drag(page, [at(90, 360), at(210, 360), at(210, 470), at(90, 470), at(90, 362)])
  await page.getByRole('button', { name: 'Guardar como sticker' }).click()
  await expect(page.getByRole('button', { name: 'Con borde blanco' })).toBeVisible({ timeout: 15000 })
  await page.screenshot({ path: info.outputPath('2-elegir-borde.png') })
  await page.getByRole('button', { name: 'Con borde blanco' }).click()
  await expect(page.getByText('¡Sticker guardado!')).toBeVisible()

  // Aparece en "Míos" y se puede pegar
  await page.getByRole('button', { name: 'Stickers' }).click()
  await page.getByRole('tab', { name: '♡ Míos' }).click()
  await page.getByRole('button', { name: 'Pegar sticker' }).first().click()
  await page.waitForTimeout(700)
  await page.screenshot({ path: info.outputPath('3-lienzo.png') })

  const els = await contents(page)
  const images = els.filter((e) => e.type === 'image')
  expect(images.map((i) => i.blobId)).toEqual(expect.arrayContaining(['builtin:mono-rosa', 'builtin:washi-vichy']))
  expect(images.filter((i) => !String(i.blobId).startsWith('builtin:'))).toHaveLength(1)
  expect(errors).toEqual([])
})

test('nota decorada: crear, editar y que se busque su texto', async ({ page }, info) => {
  await newNote(page, 'Clases')
  await page.getByRole('button', { name: 'Nota decorada' }).click()
  await page.getByPlaceholder('Escribe algo lindo…').fill('Examen de química el viernes ♡')
  await page.getByRole('button', { name: 'Chincheta' }).click()
  await page.getByRole('radio', { name: '#fff7c2' }).click()
  await page.screenshot({ path: info.outputPath('1-editor.png') })
  await page.getByRole('button', { name: 'Pegar nota' }).click()
  await expect(page.getByRole('button', { name: 'Editar nota' })).toBeVisible()
  await page.getByRole('button', { name: 'Editar nota' }).click()
  await page.getByRole('button', { name: 'Moño', exact: true }).click()
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await page.waitForTimeout(700)
  await page.screenshot({ path: info.outputPath('2-lienzo.png') })

  const [deco] = (await contents(page)).filter((e) => e.type === 'deco')
  expect(deco).toMatchObject({ text: 'Examen de química el viernes ♡', corner: 'mono', paper: '#fff7c2' })

  await page.getByRole('button', { name: 'Volver al cuaderno' }).click()
  await page.getByRole('button', { name: 'Volver al estante' }).click()
  await page.getByPlaceholder('Buscar en todas tus notas…').fill('quimica')
  // El título se puso solo con lo que dice la nota
  await expect(page.getByRole('button', { name: /Examen de química/ })).toBeVisible()
})

test('portada propia: se dibuja y aparece en el estante', async ({ page }, info) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Nuevo cuaderno' }).click()
  await page.getByPlaceholder('Mi cuaderno').fill('Mío ✨')
  await page.getByRole('radio', { name: 'La diseño yo ✏️' }).click()
  await page.getByRole('button', { name: 'Crear cuaderno' }).click()

  // Se abre directo la hoja de la portada
  const box = (await page.locator('.stage').boundingBox())!
  await page.getByRole('button', { name: 'Stickers' }).click()
  await page.getByRole('tab', { name: 'Flores' }).click()
  await page.getByRole('button', { name: 'Ramito' }).click()
  await page.getByRole('button', { name: 'Lápices' }).click()
  await page.getByRole('radio', { name: 'Pincel', exact: true }).click()
  await drag(page, Array.from({ length: 14 }, (_, i) => [box.x + box.width / 2 - 120 + i * 18, box.y + box.height / 2 + 140 + Math.sin(i) * 20] as [number, number]))
  await page.screenshot({ path: info.outputPath('1-diseno.png') })
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: 'Volver al cuaderno' }).click()
  await expect(page.getByRole('heading', { name: 'Mío ✨' })).toBeVisible()
  // La portada no aparece como nota
  await expect(page.getByText('0 notas')).toBeVisible()
  await page.getByRole('button', { name: 'Volver al estante' }).click()
  await expect(page.locator('.cover-btn image')).toBeVisible()
  await page.screenshot({ path: info.outputPath('2-estante.png') })
})

test('taller de fuentes: dibujar letras y usarlas en un texto', async ({ page }, info) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Taller de fuentes' }).click()
  await page.getByRole('button', { name: 'Nueva fuente' }).click()
  await page.getByPlaceholder('Mi letra').fill('Letra de Ana')
  await page.getByRole('button', { name: 'Empezar a dibujar' }).click()

  await page.getByRole('button', { name: 'Dibujar h', exact: true }).click()
  const pad = page.getByLabel('Plantilla de dibujo')
  const b = (await pad.boundingBox())!
  const p = (x: number, y: number): [number, number] => [b.x + (x / 1000) * b.width, b.y + (y / 1000) * b.height]
  await drag(page, [p(350, 160), p(352, 760)])
  await drag(page, [p(352, 560), p(450, 440), p(560, 470), p(580, 760)])
  await page.screenshot({ path: info.outputPath('1-plantilla.png') })
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click()
  await expect(page.getByText('i', { exact: true }).first()).toBeVisible()
  await drag(page, [p(500, 340), p(500, 760)])
  await drag(page, [p(500, 200), p(503, 205)])
  await page.getByRole('button', { name: 'Listo' }).click()
  await expect(page.getByText('2/')).toBeVisible()
  await page.waitForTimeout(800)
  await page.screenshot({ path: info.outputPath('2-taller.png') })

  // La fuente queda registrada y se puede elegir en una nota
  await expect.poll(() => page.evaluate(() => [...document.fonts].some((f) => f.family.replace(/"/g, '').startsWith('trazo-')))).toBe(true)
  await page.getByRole('button', { name: 'Volver al taller' }).click()
  await page.getByRole('button', { name: 'Volver al estante' }).click()
  const box = await newNote(page, 'Pruebas')
  await page.getByRole('button', { name: 'Texto', exact: true }).click()
  await page.getByRole('combobox', { name: 'Fuente' }).selectOption({ label: 'Letra de Ana' })
  await page.mouse.click(box.x + 150, box.y + 200)
  await page.keyboard.type('hi hi hi')
  await page.getByRole('button', { name: 'Listo' }).click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: info.outputPath('3-texto.png') })
  const [text] = (await contents(page)).filter((e) => e.type === 'text')
  expect(String(text.font)).toMatch(/^custom:/)
})
