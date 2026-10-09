import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/authcontext';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { login } = useContext(AuthContext);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const response = await fetch('http://127.0.0.1:5000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                login(data.token);
                navigate('/dashboard');
            } else {
                setError(data.message || 'Login Failed');
            }
        } catch (err) {
            setError('Could not connect to backend');
        }
    };

    return (
        <div className="glass-container">
            <div className="glass-card fade-in">
                <h2 className="card-title text-center" style={{ marginBottom: '8px' }}>Welcome Back</h2>
                <p className="text-muted text-center" style={{ marginBottom: '32px' }}>Sign in to Tag Fetcher</p>
                
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input 
                            type="email" 
                            className="form-input" 
                            placeholder="name@example.com"
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            required 
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: '32px' }}>
                        <label className="form-label">Password</label>
                        <input 
                            type="password" 
                            className="form-input" 
                            placeholder="••••••••"
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                        Sign In
                    </button>
                    {error && <p className="text-danger text-center mt-4">{error}</p>}
                </form>
            </div>
        </div>
    );
}
