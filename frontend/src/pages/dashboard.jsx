import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/authcontext";

export default function Dashboard() {
    const { logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState('');
    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleScrape = async (e) => {
        e.preventDefault();
        setError('');
        setResults(null);
        setLoading(true);
        try {
            const response = await fetch('http://127.0.0.1:5000/api/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            })
            const data = await response.json();
            if (response.ok) {
                setResults(data);
            }
            else {
                setError(data.message || 'Scraping failed');
            }
        }
        catch (err) {
            setError('coudlnt connect to python server')
        }
        finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ maxwidth: '800px', margin: '50px auto', fontFamily: 'sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>Tag Fetcher</div>
            <button onClick={handleLogout} style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Logout</button>

            <div style={{ marginTop: '30px', border: '1px solid#ccc', padding: '20px', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
                <form onSubmit={handleScrape} style={{ display: 'flex', gap: '10px' }}>
                    <input type="url" placeholder="enter website url" value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        required style={{ flex: 1, padding: '12px', fontSize: '16px' }}
                    />
                    <button type="submit" disabled={loading} style={{ padding: '12px 24px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
                        {loading ? 'Scraping...' : 'Fetch Tags'}
                    </button>

                </form>
                {error && <p style={{ color: 'red', marginTop: '15px' }}>{error}</p>}
            </div>

            {results && (
                <div style={{ marginTop: '40px', padding: '30px', border: '1px solid #ddd', borderRadius: '8px' }}>
                    <h3 style={{ marginTop: '0' }}>Scarpe Results for {results.title}</h3>
                    <div style={{ marginTop: '20px' }}>
                        <strong>Meta title:</strong>
                        {results.meta_title || 'N/A'}<br></br>

                        <strong>Meta Description:</strong>
                        {results.meta_description || 'N/A'}<br></br>
                        <strong>Meta Keywords:</strong>
                        {results.meta_keywords || 'N/A'}<br></br>


                    </div>
                    <h4 style={{ marginTop: '30px' }}>H1 headings found:</h4>
                    <ul>
                        {results.headings?.h1?.length > 0 ? results.headings.h1.map((h1, index) => <li key={index}>{h1}</li>) : 'no h1 found'}

                    </ul>
                </div>



            )}
        </div>

    )
} 
