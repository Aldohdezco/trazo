import { expect, test } from '@playwright/test'

test.describe('ayuditas', () => {
  test.skip(({ isMobile }) => !!isMobile, 'El paso del mouse se prueba en escritorio')

  test('al pasar el mouse aparece el nombre y la explicación', async ({ page }, info) => {
    await page.goto('./')
    await page.getByRole('button', { name: 'Nuevo cuaderno' }).click()
    await page.getByRole('button', { name: 'Crear cuaderno' }).click()
    await page.getByRole('button', { name: 'Nueva nota' }).click()
    await page.getByRole('button', { name: 'Crear nota' }).click()

    await page.getByRole('button', { name: 'Lápiz mágico' }).hover()
    const tip = page.getByRole('tooltip')
    await expect(tip).toContainText('Lápiz mágico')
    await expect(tip).toContainText('tu letra se convierte en texto')
    await page.screenshot({ path: info.outputPath('1-mouse.png') })

    // Al pasar a otro botón cambia al instante; al salir, desaparece
    await page.getByRole('button', { name: 'Stickers' }).hover()
    await expect(tip).toContainText('Moños, corazones')
    await page.mouse.move(600, 300)
    await expect(tip).toBeHidden()

    // Sin la ayuda nativa del navegador encima
    await expect(page.getByRole('button', { name: 'Stickers' })).not.toHaveAttribute('title')
  })

  test('con el dedo: dejar presionado muestra la ayuda sin activar el botón', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('button', { name: 'Nuevo cuaderno' }).click()
    await page.getByRole('button', { name: 'Crear cuaderno' }).click()
    await page.getByRole('button', { name: 'Nueva nota' }).click()
    await page.getByRole('button', { name: 'Crear nota' }).click()

    const borrador = page.getByRole('button', { name: 'Borrador' })
    await borrador.dispatchEvent('pointerdown', { pointerType: 'touch', bubbles: true, isPrimary: true })
    await page.waitForTimeout(650)
    await expect(page.getByRole('tooltip')).toContainText('Borra trazos enteros')
    await borrador.dispatchEvent('pointerup', { pointerType: 'touch', bubbles: true })
    await borrador.dispatchEvent('click', { bubbles: true })
    // El toque largo no cambió de herramienta
    await expect(borrador).toHaveAttribute('aria-pressed', 'false')
  })

  test('se pueden apagar en Ajustes', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('button', { name: 'Ajustes' }).click()
    await page.getByText('Mostrar ayuditas').click()
    await page.getByRole('button', { name: 'Cerrar' }).click()
    await page.getByRole('button', { name: 'Papelera' }).hover()
    await page.waitForTimeout(700)
    await expect(page.getByRole('tooltip')).toBeHidden()
  })
})
