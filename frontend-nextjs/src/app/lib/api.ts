export async function apiGet<T = unknown>(path: string): Promise<T> {
    const response = await fetch (path, {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Accept': 'application/json',
        },
        cache: 'no-store',
    });
    if (!response.ok) {
        throw new Error(`API GET request failed: ${response.status} ${response.statusText}`);
    }
    return await response.json() as Promise<T>;
}

export async function apiPost<T = unknown>(path: string, form: Record<string, string>): Promise<T> {
    const body = new URLSearchParams(form).toString();
    const response = await fetch (path, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
    });
    if (!response.ok) {
        throw new Error(`API POST request failed: ${response.status} ${response.statusText}`);
    }
    return await response.json() as Promise<T>;
}
