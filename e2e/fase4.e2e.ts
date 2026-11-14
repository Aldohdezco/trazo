import { expect, test, type Page } from '@playwright/test'
import { writeFileSync } from 'node:fs'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

async function drag(page: Page, pts: [number, number][], holdMs = 0) {
  await page.mouse.move(pts[0][0], pts[0][1])
  await page.mouse.down()
  for (const [x, y] of pts.slice(1)) await page.mouse.move(x, y, { steps: 5 })
  if (holdMs) await page.waitForTimeout(holdMs)
  await page.mouse.up()
}

function contents(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{ noteId: string; elements: { type: string; [k: string]: unknown }[] }[]>((res) => {
        const req = indexedDB.open('trazo')
        req.onsuccess = () => {
          const tx = req.result.transaction('contents').objectStore('contents').getAll()
          tx.onsuccess = () => res(tx.result)
        }
      }),
  )
}

async function samplePdf(path: string) {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.HelveticaBold)
  for (const n of [1, 2]) {
    const p = pdf.addPage([612, 792])
    p.drawText(`Tarea de biología — página ${n}`.replace('—', '-'), { x: 60, y: 700, size: 26, font, color: rgb(0.2, 0.2, 0.5) })
    p.drawRectangle({ x: 60, y: 300, width: 480, height: 300, borderColor: rgb(0.8, 0.3, 0.4), borderWidth: 3 })
  }
  writeFileSync(path, await pdf.save())
}

test('importar un PDF y escribir encima', async ({ page }, info) => {
  const file = info.outputPath('tarea.pdf')
  await samplePdf(file)
  await page.goto('./')
  await page.getByRole('button', { name: 'Nuevo cuaderno' }).click()
  await page.getByRole('button', { name: 'Crear cuaderno' }).click()
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'PDF', exact: true }).click()
  await (await chooser).setFiles(file)
  await expect(page.locator('.stage')).toBeVisible({ timeout: 20000 })
  await expect(page.locator('input.title')).toHaveValue('tarea')

  const box = (await page.locator('.stage').boundingBox())!
  await page.getByRole('button', { name: 'Pluma' }).click()
  await drag(page, Array.from({ length: 12 }, (_, i) => [box.x + 160 + i * 20, box.y + 300 + Math.sin(i) * 15] as [number, number]))
  await page.waitForTimeout(600)
  await page.screenshot({ path: info.outputPath('1-pdf.png') })

  // Un lazo grande no se lleva las páginas (están fijas); doble toque sí las elige
  await page.getByRole('button', { name: 'Lazo' }).click()
  await drag(page, [[box.x + 20, box.y + 20], [box.x + box.width - 20, box.y + 20], [box.x + box.width - 20, box.y + box.height - 120], [box.x + 20, box.y + box.height - 120], [box.x + 22, box.y + 22]])
  const els = (await contents(page)).flatMap((c) => c.elements)
  expect(els.filter((e) => e.type === 'image' && e.locked)).toHaveLength(2)
  expect(els.filter((e) => e.type === 'stroke')).toHaveLength(1)
  await page.mouse.click(box.x + box.width / 2, box.y + 500)
  await page.mouse.click(box.x + box.width / 2, box.y + 500)
  await expect(page.getByRole('button', { name: 'Borrar', exact: true })).toBeVisible()
})

test('pantalla dividida: dos notas lado a lado y copiar de una a otra', async ({ page }, info) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Nuevo cuaderno' }).click()
  await page.getByRole('button', { name: 'Crear cuaderno' }).click()
  for (const t of ['Apuntes', 'Resumen']) {
    await page.getByRole('button', { name: 'Nueva nota' }).click()
    await page.getByPlaceholder('Nota sin título').fill(t)
    await page.getByRole('button', { name: 'Crear nota' }).click()
    await page.getByRole('button', { name: 'Volver al cuaderno' }).click()
  }
  await page.getByRole('button', { name: 'Abrir Apuntes' }).click()
  await page.getByRole('button', { name: 'Pantalla dividida' }).click()
  await page.getByRole('button', { name: /Resumen/ }).click()

  const stages = page.locator('.stage')
  await expect(stages).toHaveCount(2)
  const left = (await stages.nth(0).boundingBox())!
  // Dibujo en la izquierda y lo copio a la derecha
  await page.getByRole('button', { name: 'Pincel' }).first().click()
  await drag(page, Array.from({ length: 10 }, (_, i) => [left.x + 80 + i * 15, left.y + 200 + (i % 2) * 30] as [number, number]))
  await page.getByRole('button', { name: 'Lazo' }).first().click()
  await drag(page, [[left.x + 60, left.y + 170], [left.x + 260, left.y + 170], [left.x + 260, left.y + 260], [left.x + 60, left.y + 260], [left.x + 62, left.y + 172]])
  await page.getByRole('button', { name: 'Copiar al otro lado' }).click()
  await page.waitForTimeout(800)
  await page.screenshot({ path: info.outputPath('1-dividida.png') })

  const all = await contents(page)
  const strokesPerNote = all.map((c) => c.elements.filter((e) => e.type === 'stroke').length).filter((n) => n > 0)
  expect(strokesPerNote).toEqual([1, 1])

  // "Ver solo esta nota" sale de la pantalla dividida
  await page.getByRole('button', { name: 'Ver solo esta nota' }).nth(1).click()
  await expect(page.locator('.stage')).toHaveCount(1)
  await expect(page.locator('input.title')).toHaveValue('Resumen')
})

test('figuras a mano: dejar el lápiz quieto endereza el dibujo', async ({ page }, info) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Nuevo cuaderno' }).click()
  await page.getByRole('button', { name: 'Crear cuaderno' }).click()
  await page.getByRole('button', { name: 'Nueva nota' }).click()
  await page.getByRole('button', { name: 'Crear nota' }).click()
  const b = (await page.locator('.stage').boundingBox())!
  await page.getByRole('button', { name: 'Pluma' }).click()

  // Círculo chueco, sostenido al final
  const circle = Array.from({ length: 30 }, (_, i) => {
    const a = (i / 29) * Math.PI * 2
    return [b.x + 300 + Math.cos(a) * (90 + (i % 3)), b.y + 250 + Math.sin(a) * 70] as [number, number]
  })
  await drag(page, circle, 900)
  // Rectángulo
  await drag(page, [[b.x + 600, b.y + 150], [b.x + 820, b.y + 152], [b.x + 818, b.y + 330], [b.x + 602, b.y + 328], [b.x + 603, b.y + 155]], 900)
  // Una línea dibujada rápido (sin esperar) se queda como trazo
  await drag(page, [[b.x + 200, b.y + 450], [b.x + 500, b.y + 470]])
  await page.waitForTimeout(600)
  await page.screenshot({ path: info.outputPath('1-figuras.png') })

  const els = (await contents(page)).flatMap((c) => c.elements)
  expect(els.map((e) => (e.type === 'shape' ? e.shape : e.type))).toEqual(['elipse', 'rect', 'stroke'])
})
