import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/authcontext";

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setpassword] = useState('');
    const [error, setError] = useState('');

    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault()
        setError('');
        try {
            const res = await fetch('http://localhost:5000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            })
            const data = await res.json()
            if (res.ok) {
                login(data.token)
                navigate('/dashboard')
            }
            else {
                setError(data.message || 'Login failed');
            }
        }
        catch (err) {
            console.log(err)
            setError('couldnt connect to python server');
        }
    };
    return (
        <div style={{ maxWidth: '400px', margin: 'auto', padding: '30px', border: '1px solid #ccc', borderRadius: '8px', fontFamily: 'sans-serif' }}>
            <h2>Tag Fetcher Admin</h2>
            {error && <p style={{ color: 'red', backgroundColor: '#ffe6e6', padding: '10px', borderRadius: '4px' }}>{error}</p>}
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                <input type="email" placeholder="Email(e.g., admin@test.com)" value={email} onChange={(e) => setEmail(e.target.value)}
                    required style={{ padding: '10px', fontSize: '16px' }} />
                <input type="password" placeholder="Password"
                    value={password}
                    onChange={(e) => setpassword(e.target.value)}
                    required
                    style={{ padding: '10px', fontSize: '16px' }} />
                <button type="submit" style={{ padding: '10px', fontSize: '16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Login</button>

            </form>
        </div>
    )
}
