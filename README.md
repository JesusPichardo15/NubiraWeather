# NubiraWeather

Frontend en Next.js para evaluar riesgos climatológicos antes de un evento al aire libre. Cualquier persona puede consultar el riesgo; guardar eventos y activar alertas requiere una cuenta con correo verificado.

- **App en producción:** [nubira-weather.vercel.app](https://nubira-weather.vercel.app)
- **Backend:** [api.nubiraweather.date](https://api.nubiraweather.date), en AWS Lightsail detrás de Caddy · [Repositorio del backend](https://github.com/JorgeLR0610/Nubira-server)

## Producción en Vercel

Las rutas `/api/*` de Next.js llaman a FastAPI desde el servidor. El navegador usa el mismo origen que el frontend y no llama directamente a Lightsail. Configura estas variables del lado servidor en Vercel:

| Variable | Valor en producción |
| --- | --- |
| `NUBIRA_API_URL` | `https://api.nubiraweather.date` |
| `NUBIRA_PUBLIC_URL` | `https://nubira-weather.vercel.app` |

`NUBIRA_PUBLIC_URL` debe coincidir con `FRONTEND_URL` en el backend; así se valida el origen de las solicitudes y los enlaces de cuenta apuntan a la web correcta. Si cambias el origen del frontend, actualiza también `CORS_ORIGINS` en el backend. Después de cambiar variables en Vercel, vuelve a desplegar la aplicación. Las credenciales de Neon, Amazon SES y Geoapify se configuran solo en el backend.

## Desarrollo local

Requiere **Node.js 22 o superior** y el [backend](https://github.com/JorgeLR0610/Nubira-server#desarrollo-local) en marcha en el puerto `8000`. Crea o edita `.env.local` en este repositorio con:

```dotenv
NUBIRA_API_URL=http://127.0.0.1:8000
NUBIRA_PUBLIC_URL=http://localhost:3000
```

Especifica el `8000` aunque `.env.example` o el valor de respaldo del frontend indiquen el puerto heredado `7860`.

```sh
npm ci
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Usa ese mismo origen como `FRONTEND_URL` en el backend local.

### Mapa y direcciones

El mapa usa teselas de OpenStreetMap. Si cambias de proveedor mediante `NEXT_PUBLIC_NUBIRA_TILE_URL`, conserva la atribución requerida y recompila. `NUBIRA_GEOAPIFY_API_KEY`, configurada en el backend, habilita las sugerencias y la dirección más cercana al pulsar en el mapa sin mover el marcador. Las coordenadas se pueden introducir manualmente aunque Geoapify no esté configurado o fallen las teselas.

## Verificación

```sh
npm run lint
npm test
npm run build
```

Para las pruebas de navegador, inicia el frontend y la API **locales** con SQLite y `MAIL_PROVIDER=file` en el backend. Apunta Playwright a la bandeja que el backend usa como `NUBIRA_MAIL_DIR`; no uses la API ni el correo de producción:

```sh
npx playwright install chromium
NUBIRA_PUBLIC_URL=http://localhost:3000 \
  NUBIRA_E2E_MAIL_DIR=/ruta/absoluta/a/Nubira-server/workspace/mail npm run test:e2e
```

Si ya tienes Chrome, puedes usar `NUBIRA_E2E_CHANNEL=chrome`.
