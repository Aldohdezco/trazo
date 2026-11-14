import { expect, test } from '@playwright/test'
test('stickers: las secciones se deslizan y se puede llegar a todas', async ({ page }, info) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Nota rápida' }).click()
  await page.getByRole('button', { name: 'Stickers', exact: true }).click()
  const tabs = page.getByRole('tablist')
  // La fila de secciones cabe en la ventana y se desliza de lado
  const [client, scroll, right, sheetRight] = await tabs.evaluate((el) => [el.clientWidth, el.scrollWidth, el.getBoundingClientRect().right, el.closest('[role=dialog]')!.getBoundingClientRect().right])
  expect(scroll).toBeGreaterThan(client)
  expect(right).toBeLessThanOrEqual(sheetRight)
  await page.screenshot({ path: info.outputPath('1.png') })
  await page.getByRole('button', { name: 'Ver más secciones' }).click()
  await expect.poll(() => tabs.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0)
  await page.screenshot({ path: info.outputPath('2.png') })
  await page.getByRole('tab', { name: 'Fiesta y fechas' }).click()
  await expect(page.getByRole('tab', { name: 'Fiesta y fechas' })).toHaveAttribute('aria-selected', 'true')
  await page.screenshot({ path: info.outputPath('3.png') })
})
