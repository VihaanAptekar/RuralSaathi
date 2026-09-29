const TOKEN_KEY = 'ruralsaathi.accessToken';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export function getAccessToken() {
	return window.localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token) {
	if (token) {
		window.localStorage.setItem(TOKEN_KEY, token);
	} else {
		window.localStorage.removeItem(TOKEN_KEY);
	}
}

async function request(path, { method = 'GET', body, token = getAccessToken() } = {}) {
	const headers = new Headers({ Accept: 'application/json' });
	if (body !== undefined) headers.set('Content-Type', 'application/json');
	if (token) headers.set('Authorization', `Bearer ${token}`);

	const response = await fetch(`${API_BASE_URL}${path}`, {
		method,
		headers,
		...(body !== undefined ? { body: JSON.stringify(body) } : {}),
	});

	const contentType = response.headers.get('content-type') ?? '';
	const payload = response.status === 204
		? null
		: contentType.includes('application/json')
			? await response.json()
			: await response.text();

	if (!response.ok) {
		const message = typeof payload === 'string'
			? payload
			: payload?.message ?? payload?.error ?? `Request failed (${response.status})`;
		throw new Error(message);
	}

	return payload;
}

export const api = {
	get: (path) => request(path),
	post: (path, body) => request(path, { method: 'POST', body }),
	patch: (path, body) => request(path, { method: 'PATCH', body }),
};
