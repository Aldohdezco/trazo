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
      new Promise<{ type: string; tool?: string; points?: number[]; size?: number }[]>((res) => {
        const req = indexedDB.open('trazo')
        req.onsuccess = () => {
          const tx = req.result.transaction('contents').objectStore('contents').getAll()
          tx.onsuccess = () => res(tx.result.flatMap((c: { elements: [] }) => c.elements))
        }
      }),
  )
}

test('marcatextos mágico: franja pareja detrás de la letra a mano', async ({ page }, info) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Nuevo cuaderno' }).click()
  await page.getByRole('button', { name: 'Crear cuaderno' }).click()
  await page.getByRole('button', { name: 'Nueva nota' }).click()
  await page.getByRole('button', { name: 'Crear nota' }).click()
  const b = (await page.locator('.stage').boundingBox())!
  const at = (x: number, y: number): [number, number] => [b.x + x, b.y + y]

  // "Letra a mano": dos renglones de garabatos tipo cursiva
  await page.getByRole('button', { name: 'Pluma' }).click()
  for (const [x0, y0] of [[120, 200], [320, 200], [120, 320]] as const) {
    await drag(page, Array.from({ length: 36 }, (_, i) => at(x0 + i * 4.5, y0 + Math.sin(i * 0.9) * 14 + (i % 9 === 0 ? -22 : 0))))
  }

  // Marcador chueco sobre el primer renglón
  await page.getByRole('button', { name: 'Marcador', exact: true }).click()
  await expect(page.getByRole('button', { name: '✨ Mágico' })).toHaveAttribute('aria-pressed', 'true')
  await drag(page, Array.from({ length: 40 }, (_, i) => at(110 + i * 9.5, 196 + Math.sin(i * 0.6) * 9 + i * 0.15)))
  await page.waitForTimeout(500)
  await page.screenshot({ path: info.outputPath('1-magico.png') })

  // Mismo trazo con el modo mágico apagado, sobre el segundo renglón (para comparar)
  await page.getByRole('button', { name: '✨ Mágico' }).click()
  await drag(page, Array.from({ length: 22 }, (_, i) => at(110 + i * 9.5, 316 + Math.sin(i * 0.6) * 9)))
  await page.waitForTimeout(500)
  await page.screenshot({ path: info.outputPath('2-comparacion.png') })

  const els = await elements(page)
  const kinds = els.map((e) => (e.type === 'stroke' ? e.tool : e.type))
  // La franja mágica quedó antes (detrás) de la letra; la normal, al final (encima)
  expect(kinds).toEqual(['marcador', 'pluma', 'pluma', 'pluma', 'marcador'])
  const band = els[0]
  const ys = band.points!.filter((_, i) => i % 3 === 1)
  expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(0.01)
})
