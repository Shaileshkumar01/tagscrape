import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/authcontext";
import { useEffect } from "react";

export default function Dashboard() {
    const { logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState('');
    const [history, setHistory] = useState([]);

    const fetchHistory = async () => {
        try {
            const response = await fetch('http://127.0.0.1:5000/api/history');
            if (response.ok) {
                const data = await response.json();
                setHistory(data);

            }
        }
        catch (err) {
            console.error('failed to fetch history:', err);
        }
    };


    const handleRowClick = async (runId) => {
        try {
            const response = await fetch(`http://127.0.0.1:5000/api/scrape/${runId}`);
            if (response.ok) {
                const data = await response.json();
                setResults(data);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
        catch (err) {
            console.error('failed to fetch details', err);
        }
    }


    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleScrape = async (e) => {
        e.preventDefault();
        setError('');
        setResults(null);
        fetchHistory()
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

    useEffect(() => {
        fetchHistory();
    }, []);

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


            <div style={{ marginTop: '40px' }}>
                <h2>Scrape History</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
                    <thead>
                        <tr style={{ background: '#f2f2f2' }}>
                            <th style={{ padding: '12px', border: '1px solid#ddd', textAlign: 'left' }}>ID</th>
                            <th style={{ padding: '12px', border: '1px solid#ddd', textAlign: 'left' }}>URL</th>
                            <th style={{ padding: '12px', border: '1px solid#ddd', textAlign: 'left' }}>Status</th>
                            <th style={{ padding: '12px', border: '1px solid#ddd', textAlign: 'left' }}>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.length > 0 ? history.map((run) => (<tr key={run.id} onClick={() => handleRowClick(run.id)} style={{ backgroundColor: '#fff', borderBottom: '1px solid #ddd', cursor: 'pointer' }}>
                            <td style={{ padding: '12px', border: '1px solid#ddd' }}>{run.id}</td>
                            <td style={{ padding: '12px', border: '1px solid#ddd' }}>{run.url}</td>
                            <td style={{ padding: '12px', border: '1px solid#ddd', color: run.status === 'completed' ? 'green' : 'orange' }}>{run.status}</td>

                            <td style={{ padding: '12px', border: '1px solid#ddd' }}>{new Date(run.started_at).toLocaleDateString()}</td>
                        </tr>))
                            : (
                                <tr>
                                    <td colSpan="4" style={{ padding: '12px', border: '1px solid#ddd', textAlign: 'center' }}>No history found</td>
                                </tr>
                            )}
                    </tbody>
                </table>
            </div>

        </div>

    )
} 
