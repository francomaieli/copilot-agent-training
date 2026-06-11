import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
const SESSION_STORAGE_KEY = 'jwt-auth-session'
const MICROSOFT_CERTIFICATIONS_2026 = [
  {
    title: 'Microsoft Certified: Azure AI Engineer Associate',
    retirementDate: '30 de junio de 2026',
    url: 'https://learn.microsoft.com/en-us/credentials/certifications/azure-ai-engineer/',
  },
  {
    title: 'Microsoft Certified: Azure AI Fundamentals',
    retirementDate: '30 de junio de 2026',
    url: 'https://learn.microsoft.com/en-us/credentials/certifications/azure-ai-fundamentals/',
  },
  {
    title: 'Microsoft Certified: Azure Developer Associate',
    retirementDate: '31 de julio de 2026',
    url: 'https://learn.microsoft.com/en-us/credentials/certifications/azure-developer/',
  },
  {
    title: 'Microsoft Certified: Azure Security Engineer Associate',
    retirementDate: '31 de agosto de 2026',
    url: 'https://learn.microsoft.com/en-us/credentials/certifications/azure-security-engineer/',
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

                <section className="certifications-panel">
                  <p className="panel-label">Microsoft Learn 2026</p>
                  <h3>Certificaciones con retiro programado en 2026</h3>
                  <ul className="certification-cards">
                    {MICROSOFT_CERTIFICATIONS_2026.map((certification) => (
                      <li key={certification.title} className="certification-card">
                        <p>{certification.title}</p>
                        <span>Retiro programado: {certification.retirementDate}</span>
                        <a
                          href={certification.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Ver detalle oficial
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>

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
              </>
            )}
          </section>
        )}
      </main>
    </div>
  )
}

export default App
