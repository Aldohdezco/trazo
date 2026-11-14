import { expect, test, type Page } from '@playwright/test'

function elements(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{ type: string }[]>((res) => {
        const req = indexedDB.open('trazo')
        req.onsuccess = () => {
          const tx = req.result.transaction('contents').objectStore('contents').getAll()
          tx.onsuccess = () => res(tx.result.flatMap((c: { elements: [] }) => c.elements))
        }
      }),
  )
}

test('nota rápida, guardado, título automático y "seguir escribiendo"', async ({ page }, info) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Nota rápida' }).click()
  await expect(page.locator('.stage')).toBeVisible()
  await expect(page.locator('input.title')).toHaveValue(/^Nota rápida · /)
  // La dejo sin título para que se ponga sola
  await page.locator('input.title').fill('')
  await page.locator('input.title').blur()

  const b = (await page.locator('.stage').boundingBox())!
  await page.getByRole('button', { name: 'Texto', exact: true }).click()
  await page.mouse.click(b.x + 150, b.y + 150)
  await page.keyboard.type('Ideas para el cumpleaños')
  await page.getByRole('button', { name: 'Listo' }).click()
  await expect(page.getByText('Guardado ✓')).toBeVisible()
  await page.waitForTimeout(2600)

  await page.getByRole('button', { name: 'Volver al cuaderno' }).click()
  await expect(page.getByRole('heading', { name: 'Notas rápidas' })).toBeVisible()
  await expect(page.getByText('Ideas para el cumpleaños')).toBeVisible()
  await page.getByRole('button', { name: 'Volver al estante' }).click()
  await expect(page.getByRole('region', { name: 'Seguir escribiendo' })).toBeVisible()
  await page.screenshot({ path: info.outputPath('1-estante.png') })
  await page.getByRole('button', { name: 'Abrir Ideas para el cumpleaños' }).click()
  await expect(page.locator('input.title')).toHaveValue('Ideas para el cumpleaños')
})

test('dos dedos deshacen y tres dedos rehacen', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Gestos táctiles: perfil de tablet')
  await page.goto('./')
  await page.getByRole('button', { name: 'Nota rápida' }).click()
  const b = (await page.locator('.stage').boundingBox())!
  // Un trazo con el dedo
  await page.getByRole('button', { name: 'Lápices' }).click()
  const cdp = await page.context().newCDPSession(page)
  const touch = async (type: 'touchStart' | 'touchMove' | 'touchEnd', pts: [number, number][]) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], id) => ({ x, y, id })) })
  await touch('touchStart', [[b.x + 100, b.y + 200]])
  for (let i = 1; i <= 10; i++) await touch('touchMove', [[b.x + 100 + i * 20, b.y + 200 + (i % 2) * 15]])
  await touch('touchEnd', [])
  await expect.poll(async () => (await elements(page)).length).toBe(1)

  // Toque con dos dedos: deshacer
  await touch('touchStart', [[b.x + 300, b.y + 400], [b.x + 380, b.y + 400]])
  await touch('touchEnd', [])
  await expect(page.getByText('Deshecho')).toBeVisible()
  await expect.poll(async () => (await elements(page)).length).toBe(0)

  // Toque con tres dedos: rehacer
  await touch('touchStart', [[b.x + 300, b.y + 400], [b.x + 360, b.y + 400], [b.x + 420, b.y + 400]])
  await touch('touchEnd', [])
  await expect(page.getByText('Rehecho')).toBeVisible()
  await expect.poll(async () => (await elements(page)).length).toBe(1)
})
