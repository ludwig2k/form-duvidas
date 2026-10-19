const BASE = import.meta.env.VITE_API_URL ?? ''

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

async function send(path, { headers, ...options } = {}) {
  const resp = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
  if (!resp.ok) {
    const data = await resp.json().catch(() => null)
    const detail = Array.isArray(data?.detail)
      ? data.detail.map((d) => d.msg?.replace(/^Value error, /, '')).join(' ')
      : data?.detail
    throw new ApiError(detail || `Erro ${resp.status}`, resp.status)
  }
  return resp
}

async function request(path, options) {
  const resp = await send(path, options)
  return resp.status === 204 ? null : resp.json()
}

export const getCatalogo = () => request('/api/catalogo')
export const enviarResposta = (payload) =>
  request('/api/respostas', { method: 'POST', body: JSON.stringify(payload) })

const auth = (token) => ({ headers: { 'X-Admin-Token': token } })

export const admin = {
  validar: (token) => request('/api/admin/sessao', auth(token)),
  listar: (token) => request('/api/respostas', auth(token)),
  excluir: (token, id) => request(`/api/respostas/${id}`, { method: 'DELETE', ...auth(token) }),
  csv: async (token) => (await send('/api/respostas.csv', auth(token))).blob(),
}
