# NubiraWeather

Frontend de Nubira Weather. Requiere Node.js 22 o superior y la API de [`Nubira`](../Nubira/README.md) en marcha.

```sh
npm ci
npm run dev
```

Abre `http://localhost:3000`. Por defecto Next.js apunta a `http://127.0.0.1:7860`; para cambiarlo, copia `.env.example` a `.env.local` y ajusta `NUBIRA_API_URL`. Usa el mismo `NUBIRA_PUBLIC_URL` que en el backend. Las credenciales de infraestructura, si se usa `NUBIRA_API_TOKEN`, quedan del lado del servidor. El navegador nunca llama directamente a FastAPI.

El mapa viene con teselas de OpenStreetMap y permite acercar o alejar con la rueda, el gesto táctil o los botones. Para otro proveedor de teselas conserva la atribución requerida; puedes cambiar la URL en tiempo de compilación con `NEXT_PUBLIC_NUBIRA_TILE_URL`. Las sugerencias de direcciones requieren `NUBIRA_GEOAPIFY_API_KEY` en el backend, no en Next.js. El mapa y la entrada manual de coordenadas siguen disponibles sin esa clave; las coordenadas también se pueden escribir si las teselas no cargan.

## Verificación

```sh
npm run lint
npm test
npm run build
```

El escenario de navegador usa una API real y una bandeja de correo de desarrollo. Inicia ambos servicios; pasa la ruta de la bandeja mediante `NUBIRA_E2E_MAIL_DIR` y ejecuta `npm run test:e2e`. El navegador predeterminado es Chromium instalado con `npx playwright install chromium`. Si ya tienes Chrome, puedes usar `NUBIRA_E2E_CHANNEL=chrome`.
