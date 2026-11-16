/* API client: JWT in localStorage, automatic logout on 401 */
const API = {
  token: localStorage.getItem('ciq_token'),
  onLogout: null,
  setToken(t) { this.token = t; t ? localStorage.setItem('ciq_token', t) : localStorage.removeItem('ciq_token'); },
  async req(method, path, body) {
    const res = await fetch('/api' + path, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(this.token ? { Authorization: 'Bearer ' + this.token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401 && this.token) { this.setToken(null); this.onLogout && this.onLogout(); }
    if (!res.ok) {
      let msg = res.statusText;
      try { const j = await res.json(); msg = typeof j.detail === 'string' ? j.detail : (j.detail || []).map(d => d.msg).join(', '); } catch (e) {}
      throw new Error(msg);
    }
    return res.json();
  },
  get: (p) => API.req('GET', p), post: (p, b) => API.req('POST', p, b || {}),
  put: (p, b) => API.req('PUT', p, b || {}), del: (p) => API.req('DELETE', p),
  async download(path) {
    const res = await fetch('/api' + path, { headers: { Authorization: 'Bearer ' + this.token } });
    if (!res.ok) throw new Error('Download failed');
    const cd = res.headers.get('Content-Disposition') || '';
    const name = (cd.match(/filename="(.+?)"/) || [])[1] || 'report';
    const url = URL.createObjectURL(await res.blob());
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  },
};
