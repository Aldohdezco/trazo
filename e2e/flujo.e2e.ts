import { expect, test, type Page } from '@playwright/test'

async function drag(page: Page, pts: [number, number][]) {
  await page.mouse.move(pts[0][0], pts[0][1])
  await page.mouse.down()
  for (const [x, y] of pts.slice(1)) await page.mouse.move(x, y, { steps: 6 })
  await page.mouse.up()
}

test('crear cuaderno, nota, dibujar, escribir y volver', async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Trazo' })).toBeVisible()
  await page.screenshot({ path: info.outputPath('1-estante-vacio.png') })

  await page.getByRole('button', { name: 'Nuevo cuaderno' }).click()
  await page.getByPlaceholder('Mi cuaderno').fill('Clases ♡')
  await page.getByRole('radio', { name: 'Perlas' }).click()
  await page.getByRole('radio', { name: 'Lila' }).first().click()
  await page.screenshot({ path: info.outputPath('2-nuevo-cuaderno.png') })
  await page.getByRole('button', { name: 'Crear cuaderno' }).click()

  await page.getByRole('button', { name: 'Nueva nota' }).click()
  await page.getByPlaceholder('Nota sin título').fill('Química')
  await page.getByRole('radio', { name: 'Cuadrícula' }).click()
  await page.getByRole('button', { name: 'Crear nota' }).click()

  const stage = page.locator('.stage')
  await expect(stage).toBeVisible()
  const box = (await stage.boundingBox())!
  const at = (x: number, y: number): [number, number] => [box.x + x, box.y + y]

  // Pluma: una ola
  await drag(page, Array.from({ length: 20 }, (_, i) => at(120 + i * 18, 160 + Math.sin(i / 2) * 30)))
  // Marcador
  await page.getByRole('button', { name: 'Marcador', exact: true }).click()
  await drag(page, [at(110, 260), at(500, 262)])
  // Figura (corazón por defecto)
  await page.getByRole('button', { name: 'Figuras' }).click()
  await page.getByRole('button', { name: 'Rellena' }).click()
  await drag(page, [at(600, 120), at(720, 230)])
  // Línea con flecha
  await page.getByRole('button', { name: 'Líneas' }).click()
  await page.getByRole('button', { name: 'Flecha' }).click()
  await drag(page, [at(560, 300), at(760, 360)])
  // Texto
  await page.getByRole('button', { name: 'Texto', exact: true }).click()
  await page.mouse.click(...at(130, 340))
  await page.keyboard.type('Hola, esto es Trazo ✨')
  await page.getByRole('button', { name: 'Listo' }).click()

  // Lazo: rodear la ola y moverla
  await page.getByRole('button', { name: 'Lazo' }).click()
  await drag(page, [at(100, 110), at(480, 110), at(480, 220), at(100, 220), at(100, 112)])
  await expect(page.getByRole('toolbar', { name: 'Acciones de la selección' })).toBeVisible()
  await drag(page, [at(250, 160), at(290, 200)])
  await page.screenshot({ path: info.outputPath('3-nota.png') })

  // Deshacer el movimiento y rehacerlo
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await page.getByRole('button', { name: 'Rehacer' }).click()

  // Volver: debe aparecer la miniatura
  await page.waitForTimeout(600)
  await page.getByRole('button', { name: 'Volver al cuaderno' }).click()
  await expect(page.getByText('Química')).toBeVisible()
  await page.waitForTimeout(3200)
  await page.reload()
  await expect(page.locator('.thumb img')).toBeVisible()
  await page.screenshot({ path: info.outputPath('4-cuaderno.png') })

  // Al reabrir, el contenido sigue ahí
  await page.getByRole('button', { name: 'Abrir Química' }).click()
  await expect(page.locator('.stage canvas').first()).toBeVisible()
  await page.waitForTimeout(400)
  await page.screenshot({ path: info.outputPath('5-reabierta.png') })

  await page.getByRole('button', { name: 'Volver al cuaderno' }).click()
  await page.getByRole('button', { name: 'Volver al estante' }).click()
  await page.screenshot({ path: info.outputPath('6-estante.png') })

  expect(errors).toEqual([])
})

test('exportar PNG, PDF y respaldo', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Nuevo cuaderno' }).click()
  await page.getByRole('button', { name: 'Crear cuaderno' }).click()
  await page.getByRole('button', { name: 'Nueva nota' }).click()
  await page.getByRole('button', { name: 'Crear nota' }).click()
  const box = (await page.locator('.stage').boundingBox())!
  await drag(page, [[box.x + 100, box.y + 100], [box.x + 400, box.y + 300], [box.x + 600, box.y + 120]])

  for (const [label, ext] of [['Nota como imagen (PNG)', '.png'], ['Nota como PDF', '.pdf']]) {
    await page.getByRole('button', { name: 'Exportar', exact: true }).click()
    const dl = page.waitForEvent('download')
    await page.getByRole('button', { name: label }).click()
    const file = await dl
    expect(file.suggestedFilename()).toMatch(new RegExp(ext.replace('.', '\.') + '$'))
    expect((await (await file.createReadStream()).toArray()).length).toBeGreaterThan(0)
  }

  await page.getByRole('button', { name: 'Volver al cuaderno' }).click()
  await page.getByRole('button', { name: 'Volver al estante' }).click()
  await page.getByRole('button', { name: 'Ajustes' }).click()
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Guardar respaldo' }).click()
  expect((await dl).suggestedFilename()).toMatch(/^trazo-respaldo-.*\.trazo$/)
})

test('escritura mágica, marcador sobre texto y búsqueda', async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  // Respuesta simulada de MyScript: revisa que lleguen las llaves y la firma.
  let request: { headers: Record<string, string>; body: { contentType: string; strokes: unknown[]; configuration: { lang: string } } } | null = null
  await page.route('https://cloud.myscript.com/**', async (route) => {
    request = { headers: route.request().headers(), body: route.request().postDataJSON() }
    await route.fulfill({ status: 200, contentType: 'text/plain', body: 'hola mundo' })
  })

  await page.goto('./')
  await page.getByRole('button', { name: 'Ajustes' }).click()
  await page.getByRole('button', { name: 'MyScript' }).click()
  await page.getByLabel('Application key').fill('app-123')
  await page.getByLabel('Application key').blur()
  await page.getByLabel('HMAC key').fill('hmac-456')
  await page.getByLabel('HMAC key').blur()
  await page.screenshot({ path: info.outputPath('1-ajustes.png'), fullPage: true })
  await page.getByRole('button', { name: 'Cerrar' }).click()

  await page.getByRole('button', { name: 'Nuevo cuaderno' }).click()
  await page.getByPlaceholder('Mi cuaderno').fill('Diario')
  await page.getByRole('button', { name: 'Crear cuaderno' }).click()
  await page.getByRole('button', { name: 'Nueva nota' }).click()
  await page.getByPlaceholder('Nota sin título').fill('Lunes')
  await page.getByRole('button', { name: 'Crear nota' }).click()

  const box = (await page.locator('.stage').boundingBox())!
  const at = (x: number, y: number): [number, number] => [box.x + x, box.y + y]

  // Dos trazos "en cursiva" con el Lápiz mágico
  await page.getByRole('button', { name: 'Lápiz mágico' }).click()
  await drag(page, Array.from({ length: 16 }, (_, i) => at(150 + i * 10, 200 + Math.sin(i) * 20)))
  await drag(page, Array.from({ length: 16 }, (_, i) => at(330 + i * 10, 200 + Math.cos(i) * 20)))
  await expect.poll(() => request).not.toBeNull()
  await expect(page.getByText('Leyendo tu letra')).toBeHidden()
  await page.waitForTimeout(200)

  expect(request!.headers['applicationkey']).toBe('app-123')
  expect(request!.headers['hmac']).toMatch(/^[0-9a-f]{128}$/)
  expect(request!.body.contentType).toBe('Text')
  expect(request!.body.configuration.lang).toBe('es_ES')
  expect(request!.body.strokes).toHaveLength(2)
  await page.screenshot({ path: info.outputPath('2-convertido.png') })

  // Marcador amarillo sobre el texto convertido: pinta el fondo, no deja trazo
  await page.getByRole('button', { name: 'Marcador', exact: true }).click()
  await page.getByRole('radio', { name: '#ffe7a3' }).click()
  await drag(page, [at(140, 205), at(260, 205)])
  await page.screenshot({ path: info.outputPath('3-resaltado.png') })

  // La nota se encuentra buscando su texto, sin acentos ni mayúsculas
  await page.waitForTimeout(700)
  await page.getByRole('button', { name: 'Volver al cuaderno' }).click()
  await page.getByRole('button', { name: 'Volver al estante' }).click()
  await page.getByPlaceholder('Buscar en todas tus notas…').fill('MUNDO')
  await expect(page.getByRole('button', { name: /Lunes/ })).toBeVisible()
  await page.screenshot({ path: info.outputPath('4-busqueda.png') })
  await page.getByRole('button', { name: /Lunes/ }).click()

  // Lazo + "Convertir a texto" también funciona con trazos normales
  await page.getByRole('button', { name: 'Pluma' }).click()
  await drag(page, [at(150, 400), at(170, 380), at(190, 420), at(210, 380)])
  await page.getByRole('button', { name: 'Lazo' }).click()
  await drag(page, [at(130, 360), at(240, 360), at(240, 440), at(130, 440), at(130, 362)])
  request = null
  await page.getByRole('button', { name: 'Convertir a texto' }).click()
  await expect.poll(() => request).not.toBeNull()
  await expect(page.getByText('Leyendo tu letra')).toBeHidden()
  await page.waitForTimeout(300)
  await page.screenshot({ path: info.outputPath('5-lazo-convertir.png') })

  expect(errors).toEqual([])
})
