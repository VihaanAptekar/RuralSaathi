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

let tokenRequest;

async function parseResponse(response) {
	const contentType = response.headers.get('content-type') ?? '';
	return response.status === 204
		? null
		: contentType.includes('application/json')
			? await response.json()
			: await response.text();
}


function errorMessage(payload, response) {
	return typeof payload === 'string'
		? payload
		: payload?.message ?? payload?.error ?? `Request failed (${response.status})`;
}

async function getOrCreateAccessToken() {
	const existing = getAccessToken();
	if (existing) return existing;

	if (!tokenRequest) {
		tokenRequest = (async () => {
			const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
				method: 'POST',
				headers: new Headers({ Accept: 'application/json', 'Content-Type': 'application/json' }),
				body: '{}',
			});
			const payload = await parseResponse(response);
			if (!response.ok) throw new Error(errorMessage(payload, response));
			const token = payload?.token ?? payload?.accessToken;
			if (typeof token !== 'string' || token.length === 0) {
				throw new Error('The API login response did not include a token.');
			}
			setAccessToken(token);
			return token;
		})().finally(() => {
			tokenRequest = undefined;
		});
	}

	return tokenRequest;
}

async function send(path, method, body, token) {
	const headers = new Headers({ Accept: 'application/json' });
	if (body !== undefined) headers.set('Content-Type', 'application/json');
	if (token) headers.set('Authorization', `Bearer ${token}`);
	return fetch(`${API_BASE_URL}${path}`, {
		method,
		headers,
		...(body !== undefined ? { body: JSON.stringify(body) } : {}),
	});
}

async function request(path, { method = 'GET', body } = {}) {
	let token = await getOrCreateAccessToken();
	let response = await send(path, method, body, token);
	if (response.status === 401) {
		setAccessToken(null);
		token = await getOrCreateAccessToken();
		response = await send(path, method, body, token);
	}
	const payload = await parseResponse(response);
	if (!response.ok) {
		throw new Error(errorMessage(payload, response));
	}
	return payload;
}

export const api = {
	get: (path) => request(path),
	post: (path, body) => request(path, { method: 'POST', body }),
	patch: (path, body) => request(path, { method: 'PATCH', body }),
};
