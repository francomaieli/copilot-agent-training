import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
const SESSION_STORAGE_KEY = 'jwt-auth-session'

const MICROSOFT_CERTS_2026 = [
  {
    code: 'AI-200',
    name: 'Azure AI Cloud Developer Associate',
    level: 'Associate',
    description: 'Construye apps cloud nativas con IA generativa y Azure Foundry. Reemplaza AZ-204.',
  },
  {
    code: 'AI-103',
    name: 'Azure AI App & Agent Developer',
    level: 'Associate',
    description: 'Desarrolla agentes de IA, sistemas multi-agente y apps generativas. Evolución de AI-102.',
  },
  {
    code: 'AI-300',
    name: 'MLOps Engineer Associate',
    level: 'Associate',
    description: 'Gestiona el ciclo de vida de soluciones IA y operaciones de Machine Learning. Reemplaza DP-100.',
  },
  {
    code: 'SC-500',
    name: 'Cloud & AI Security Engineer',
    level: 'Associate',
    description: 'Asegura entornos habilitados con IA en Azure. Reemplaza AZ-500.',
  },
  {
    code: 'AI-901',
    name: 'Azure AI Fundamentals',
    level: 'Fundamentals',
    description: 'Fundamentos renovados sobre IA en Azure, Copilot y modelos generativos. Actualiza AI-900.',
  },
  {
    code: 'AB-900',
    name: 'Copilot & Agent Admin Fundamentals',
    level: 'Fundamentals',
    description: 'Administración de Copilot y agentes IA en organizaciones. Nueva certificación 2026.',
  },
]

function normalizeRoute(pathname) {
  return pathname === '/welcome' ? '/welcome' : '/login'
}

function readSession() {
  const rawSession = window.sessionStorage.getItem(SESSION_STORAGE_KEY)

  if (!rawSession) {
    return null
  }

  try {
    return JSON.parse(rawSession)
  } catch {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY)
    return null
  }
}

function saveSession(session) {
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
}

function clearSession() {
  window.sessionStorage.removeItem(SESSION_STORAGE_KEY)
}

async function requestToken(username, password) {
  const response = await fetch(`${API_BASE_URL}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      username,
      password,
    }),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.detail ?? 'No se pudo iniciar sesión.')
  }

  return response.json()
}

async function verifyToken(token) {
  const response = await fetch(`${API_BASE_URL}/verify`, {
    headers: {
      Authorization: 'Bearer ' + token,
    },
  })

  if (!response.ok) {
    throw new Error('Tu sesión expiró o no es válida.')
  }

  return response.json()
}

function App() {
  const [route, setRoute] = useState(() => normalizeRoute(window.location.pathname))
  const [credentials, setCredentials] = useState({ username: '', password: '' })
  const [session, setSession] = useState(() => readSession())
  const [user, setUser] = useState(() => readSession()?.username ?? '')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(false)

  const sessionExpiresAt = useMemo(() => {
    if (!session?.expiresAt) {
      return 'Sin sesión activa'
    }

    return new Intl.DateTimeFormat('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(session.expiresAt))
  }, [session])

  useEffect(() => {
    const handlePopState = () => {
      setRoute(normalizeRoute(window.location.pathname))
    }

    window.addEventListener('popstate', handlePopState)

    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (route !== '/welcome') {
      return
    }

    if (!session?.accessToken) {
      queueMicrotask(() => {
        window.history.replaceState({}, '', '/login')
        setRoute('/login')
        setErrorMessage('Inicia sesión para acceder a la bienvenida.')
      })
      return
    }

    if (session.expiresAt <= Date.now()) {
      queueMicrotask(() => {
        clearSession()
        setSession(null)
        setUser('')
        window.history.replaceState({}, '', '/login')
        setRoute('/login')
        setErrorMessage('Tu sesión expiró. Inicia sesión nuevamente.')
      })
      return
    }

    let ignore = false

    queueMicrotask(() => {
      setIsCheckingSession(true)
    })

    verifyToken(session.accessToken)
      .then((payload) => {
        if (ignore) {
          return
        }

        setUser(payload.user)

        if (payload.user !== session.username) {
          const nextSession = { ...session, username: payload.user }
          setSession(nextSession)
          saveSession(nextSession)
        }
      })
      .catch((error) => {
        if (ignore) {
          return
        }

        clearSession()
        setSession(null)
        setUser('')
        window.history.replaceState({}, '', '/login')
        setRoute('/login')
        setErrorMessage(error.message)
      })
      .finally(() => {
        if (!ignore) {
          setIsCheckingSession(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [route, session])

  const goToRoute = (nextRoute, replace = false) => {
    const target = normalizeRoute(nextRoute)
    const historyMethod = replace ? 'replaceState' : 'pushState'

    window.history[historyMethod]({}, '', target)
    setRoute(target)
  }

  const handleChange = ({ target: { name, value } }) => {
    setCredentials((currentCredentials) => ({
      ...currentCredentials,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setIsSubmitting(true)

    try {
      const payload = await requestToken(credentials.username, credentials.password)
      const nextSession = {
        accessToken: payload.access_token,
        username: credentials.username,
        expiresAt: Date.now() + payload.expires_in * 1000,
      }

      saveSession(nextSession)
      setSession(nextSession)
      setUser(credentials.username)
      setCredentials({ username: '', password: '' })
      goToRoute('/welcome')
    } catch (error) {
      setErrorMessage(
        error.message === 'Failed to fetch'
          ? 'No fue posible conectar con el backend. Verifica que esté ejecutándose.'
          : error.message,
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLogout = () => {
    clearSession()
    setSession(null)
    setUser('')
    setErrorMessage('')
    goToRoute('/login', true)
  }

  return (
    <div className="app-shell">
      <section className="brand-panel">
        <p className="eyebrow">JWT ACCESS</p>
        <h1>Accede a la bienvenida segura del proyecto.</h1>
        <p className="supporting-copy">
          Una interfaz en React que consume el backend FastAPI y guarda el token
          JWT en la sesión del navegador para proteger el acceso.
        </p>

        <ul className="feature-list">
          <li>Diseño oscuro inspirado en Spotify definido en DESIGN.md.</li>
          <li>Login contra el endpoint /token del backend.</li>
          <li>Ruta /welcome protegida con verificación en /verify.</li>
        </ul>
      </section>

      <main className="auth-card">
        <div className="route-switcher" aria-label="Navegación de la aplicación">
          <button
            type="button"
            className={`route-button ${route === '/login' ? 'is-active' : ''}`}
            onClick={() => goToRoute('/login')}
          >
            Login
          </button>
          <button
            type="button"
            className={`route-button ${route === '/welcome' ? 'is-active' : ''}`}
            onClick={() => goToRoute('/welcome')}
          >
            Bienvenida
          </button>
        </div>

        {route === '/login' ? (
          <section className="panel-content">
            <div className="panel-heading">
              <p className="panel-label">Inicio de sesión</p>
              <h2>Ingresa con tu cuenta JWT</h2>
              <p>
                Usa las credenciales de demostración del backend para crear la
                sesión protegida.
              </p>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              <label className="field">
                <span>Usuario</span>
                <input
                  autoComplete="username"
                  name="username"
                  onChange={handleChange}
                  placeholder="admin"
                  required
                  value={credentials.username}
                />
              </label>

              <label className="field">
                <span>Contraseña</span>
                <input
                  autoComplete="current-password"
                  name="password"
                  onChange={handleChange}
                  placeholder="admin123"
                  required
                  type="password"
                  value={credentials.password}
                />
              </label>

              {errorMessage ? <p className="feedback error">{errorMessage}</p> : null}

              <button className="primary-action" disabled={isSubmitting} type="submit">
                {isSubmitting ? 'Validando...' : 'Ingresar'}
              </button>
            </form>

            <dl className="credentials-card">
              <div>
                <dt>Usuario</dt>
                <dd>admin</dd>
              </div>
              <div>
                <dt>Contraseña</dt>
                <dd>admin123</dd>
              </div>
              <div>
                <dt>Backend</dt>
                <dd>{API_BASE_URL}</dd>
              </div>
            </dl>
          </section>
        ) : (
          <section className="panel-content">
            <div className="panel-heading">
              <p className="panel-label">Ruta protegida</p>
              <h2>Bienvenido{user ? `, ${user}` : ''}</h2>
              <p>
                Esta página solo está disponible cuando existe una sesión JWT
                válida en el navegador.
              </p>
            </div>

            {isCheckingSession ? (
              <p className="feedback neutral">Verificando tu sesión...</p>
            ) : (
              <>
                <div className="session-summary">
                  <div>
                    <span>Usuario autenticado</span>
                    <strong>{user || 'Sin validar'}</strong>
                  </div>
                  <div>
                    <span>Vence a las</span>
                    <strong>{sessionExpiresAt}</strong>
                  </div>
                  <div>
                    <span>Estado</span>
                    <strong>Protegido</strong>
                  </div>
                </div>

                <div className="welcome-actions">
                  <button
                    type="button"
                    className="secondary-action"
                    onClick={() => goToRoute('/login')}
                  >
                    Volver al login
                  </button>
                  <button
                    type="button"
                    className="primary-action"
                    onClick={handleLogout}
                  >
                    Cerrar sesión
                  </button>
                </div>

                <div className="certs-section">
                  <p className="certs-section-title">Certificaciones Microsoft 2026</p>
                  <div className="certs-grid">
                    {MICROSOFT_CERTS_2026.map((cert) => (
                      <div key={cert.code} className="cert-card">
                        <span className="cert-code">{cert.code}</span>
                        <p className="cert-name">{cert.name}</p>
                        <span className="cert-level">{cert.level}</span>
                        <p className="cert-description">{cert.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  )
}

export default App
