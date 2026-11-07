# Trazo 🎀

Cuadernos digitales lindos para tablet y PC: lienzo libre, dibujo a mano, figuras, texto e imágenes. Todo se guarda en el dispositivo.

**App:** https://aldohdezco.github.io/trazo/

## Instalar en la tablet

- **iPad (Safari):** abre el link → botón Compartir → *Agregar a inicio*.
- **Android (Chrome):** abre el link → menú ⋮ → *Instalar app*.

Funciona sin internet una vez instalada. Los datos viven solo en ese dispositivo: usa **Ajustes → Guardar respaldo** de vez en cuando.

## Desarrollo

```bash
npm install --include=dev   # --include=dev si NODE_ENV=production en tu equipo
npm run dev                 # http://localhost:5173/trazo/ (también en la red local)
npm run check               # tipos
npm test                    # pruebas unitarias (Vitest)
npm run e2e                 # flujos en navegador (Playwright)
npm run build
```

Cada push a `main` se publica solo en GitHub Pages.

Ver [SPEC.md](SPEC.md) para el alcance y las fases.
