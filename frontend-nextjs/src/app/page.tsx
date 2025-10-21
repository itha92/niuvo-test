'use client';

import { useEffect, useState } from "react";
import { apiGet } from "../app/lib/api";

type Me = { authenticated: boolean; name?: string , role?: string, sub?: string};

export default function HomePage() {
    const [me, setMe] = useState<Me | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchMe() {
            try {
              const data = await apiGet<Me>('/api/auth/me');
              setMe(data);
            } catch (err) {
              setError((err as Error).message);
            }
        }
        fetchMe();
    }, []);
    
    return (
        <main style={{ maxWidth: 600, margin: '0 auto', padding: '1rem' }}>
            <h1>Hub</h1>
            {error && <div style={{ color: 'red' }}>Error: {error}</div>}
            {me ? (
                me.authenticated ? (
                    <>
            <div>
              <p>Welcome, {me.name}!</p>
              <p>Role: {me.role}</p>
              <p>Sub: {me.sub}</p>
            </div>
            <div>
                <p><a href='/angular1'>Go to Angular1 App</a></p>
                <p><a href='/angular2'>Go to Angular2 App</a></p>
            </div>
            <div>
                <form method="post" action="/api/auth/logout">
                  <button type="submit">Logout</button>
                </form>
            </div>
                    </>
                ) : (
                  <>
                    <p>You are not logged in.</p>
                    <p><a href="/login">Login with OTP</a></p>
                  </>
                )
            ) : (
              <p>Loading...</p>
            )}
        </main>
    );
}