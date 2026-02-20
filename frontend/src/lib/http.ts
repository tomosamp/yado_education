import axios from 'axios'

const appUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export const http = axios.create({
  baseURL: appUrl,
  withCredentials: true,
  withXSRFToken: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    Accept: 'application/json',
  },
})

export async function ensureCsrfCookie() {
  await http.get('/sanctum/csrf-cookie')
}
