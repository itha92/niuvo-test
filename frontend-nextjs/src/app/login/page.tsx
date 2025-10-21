'use client';

import { FormEvent, useState } from "react";  
import { useRouter } from "next/navigation";
import { apiPost } from "../lib/api";

export default function LoginPage() {
    const [phone, setPhone] = useState('50412345678');
    const [otp, setOtp] = useState('123456');
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    async function onSubmit(event: FormEvent) {
        event.preventDefault();
        setError(null);
        try {
            await apiPost('/api/auth/login/otp', { phone, otp });
            router.push('/angular1');
        } catch (err) {
            setError((err as Error).message);
        }
    }
    
    return (
        <main style={{ maxWidth: 400, margin: '0 auto', padding: '1rem' }}>
            <h1>Login with OTP</h1>
            <form onSubmit={onSubmit}>
                <div style={{ marginBottom: '1rem' }}>
                    <label>
                        Phone Number:
                        <input
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }}
                        />
                    </label>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <label>
                        OTP:
                        <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }}
                        />
                    </label>
                </div>
                {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}
                <button type="submit" style={{ padding: '0.5rem 1rem' }}>Login</button>
            </form>
        </main>
    );
}