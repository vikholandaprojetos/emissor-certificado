// Edge Middleware: protege /admin e /api com Basic Auth.
// A imagem /i/:id continua PUBLICA (nao entra no matcher).
// Vazio (sem ADMIN_USER/ADMIN_PASS) = sem senha.
export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
};

export default function middleware(req) {
  const user = process.env.ADMIN_USER || '';
  const pass = process.env.ADMIN_PASS || '';
  if (!user && !pass) return; // sem protecao

  const header = req.headers.get('authorization') || '';
  const [scheme, b64] = header.split(' ');
  if (scheme === 'Basic' && b64) {
    const [u, p] = atob(b64).split(':');
    if (u === user && p === pass) return; // autorizado
  }
  return new Response('Auth required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="admin"' },
  });
}
