import { Link, useRouteError } from 'react-router'

export default function RouteError() {
  const error = useRouteError()
  return <main style={{ padding: '80px 32px', minHeight: '100svh', background: '#111413' }}><h1>Diese Seite konnte nicht geladen werden.</h1><p>{error instanceof Error ? error.message : 'Bitte versuche es erneut.'}</p><Link to="/">Zur Startseite</Link></main>
}
