# JWT Auth Demo: backend + frontend React

Proyecto de laboratorio con un backend FastAPI y un frontend React para autenticación JWT con página de login y página de bienvenida protegida.

## Estructura

```text
backend/   API FastAPI con endpoints /token, /refresh y /verify
frontend/  Aplicación React creada con Vite
```

## Qué hace la aplicación

- Permite iniciar sesión desde React usando el endpoint `POST /token`
- Guarda el token JWT en la sesión del navegador (`sessionStorage`)
- Protege la ruta `/welcome` y valida la sesión contra `GET /verify`
- Aplica un estilo visual oscuro inspirado en Spotify, siguiendo `DESIGN.md`

## Credenciales de prueba

- Usuario: `admin`
- Contraseña: `admin123`

## Requisitos

- Python 3.10+
- Poetry
- Node.js 24+ y npm

## Cómo ejecutar el backend

```bash
cd /home/runner/work/copilot-agent-training/copilot-agent-training/francomaieli/copilot-agent-training/backend
poetry install
poetry run uvicorn main:app --reload
```

El backend queda disponible en `http://localhost:8000`.

## Cómo ejecutar el frontend

```bash
cd /home/runner/work/copilot-agent-training/copilot-agent-training/francomaieli/copilot-agent-training/frontend
npm install
npm run dev
```

El frontend queda disponible en `http://localhost:5173`.

### Configuración opcional del frontend

Por defecto, el frontend consume el backend en `http://localhost:8000`.
Si necesitas otro origen, define la variable:

```bash
VITE_API_BASE_URL=http://localhost:8000
```

## Flujo de uso

1. Levanta el backend
2. Levanta el frontend
3. Abre `http://localhost:5173`
4. Inicia sesión con `admin / admin123`
5. La aplicación redirige a `/welcome`
6. Si no hay sesión válida, la ruta protegida vuelve al login

## Validación realizada

- `poetry run pytest` en `backend/`
- `npm run lint` en `frontend/`
- `npm run build` en `frontend/`

## Licencia

MIT
