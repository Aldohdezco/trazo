import { expect, test } from '@playwright/test'

// Descarga el modelo real (~44 MB) de Hugging Face: solo en escritorio y con tiempo de sobra.
test('recortar el sujeto de una foto', async ({ page, isMobile }, info) => {
  test.skip(!!isMobile, 'Una vez basta')
  test.setTimeout(240_000)
  await page.goto('./')
  await page.getByRole('button', { name: 'Nuevo cuaderno' }).click()
  await page.getByRole('button', { name: 'Crear cuaderno' }).click()
  await page.getByRole('button', { name: 'Nueva nota' }).click()
  await page.getByRole('button', { name: 'Crear nota' }).click()
  await expect(page.locator('.stage')).toBeVisible()

  // Una "foto": muñequito sobre un fondo de pasto y cielo
  await page.evaluate(async () => {
    const c = document.createElement('canvas')
    c.width = 800
    c.height = 600
    const g = c.getContext('2d')!
    const sky = g.createLinearGradient(0, 0, 0, 600)
    sky.addColorStop(0, '#9fd3f5')
    sky.addColorStop(0.6, '#d9f0ff')
    sky.addColorStop(0.61, '#7cc46a')
    sky.addColorStop(1, '#4f9a45')
    g.fillStyle = sky
    g.fillRect(0, 0, 800, 600)
    g.fillStyle = '#e0475f'
    g.beginPath()
    g.ellipse(400, 380, 110, 150, 0, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#f6d1b8'
    g.beginPath()
    g.arc(400, 190, 75, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#3a2430'
    g.beginPath()
    g.arc(375, 180, 8, 0, Math.PI * 2)
    g.arc(425, 180, 8, 0, Math.PI * 2)
    g.fill()
    const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), 'image/png'))
    const input = document.querySelector('input[type=file][accept*="image"]') as HTMLInputElement
    const dt = new DataTransfer()
    dt.items.add(new File([blob], 'foto.png', { type: 'image/png' }))
    input.files = dt.files
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })

  await page.getByRole('button', { name: 'Recortar sujeto' }).click()
  await expect(page.getByText('¡Listo! El recorte quedó encima')).toBeVisible({ timeout: 200_000 })
  await page.getByRole('button', { name: 'Lazo' }).click()
  // Muevo el recorte a un lado para verlo junto a la foto
  const sel = page.getByRole('toolbar', { name: 'Acciones de la selección' })
  await expect(sel).toBeVisible()
  const b = (await page.locator('.stage').boundingBox())!
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2 - 40)
  await page.mouse.down()
  await page.mouse.move(b.x + b.width / 2 + 330, b.y + b.height / 2 - 40, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(500)
  await page.screenshot({ path: info.outputPath('1-recorte.png') })

  const images = await page.evaluate(
    () =>
      new Promise<{ w: number; h: number }[]>((res) => {
        const req = indexedDB.open('trazo')
        req.onsuccess = () => {
          const tx = req.result.transaction('contents').objectStore('contents').getAll()
          tx.onsuccess = () => res(tx.result.flatMap((c: { elements: { type: string }[] }) => c.elements.filter((e) => e.type === 'image')) as never)
        }
      }),
  )
  expect(images).toHaveLength(2)
  // El recorte es más chico que la foto (sin el cielo ni el pasto alrededor)
  expect(images[1].w).toBeLessThan(images[0].w * 0.6)
})
