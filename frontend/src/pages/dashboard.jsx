import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/authcontext";

export default function Dashboard() {
    const { logout, roleId } = useContext(AuthContext);
    const navigate = useNavigate();
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null); // The actual scraped tags
    const [error, setError] = useState('');
    
    const [sites, setSites] = useState([]); // List of unique websites
    const [selectedSite, setSelectedSite] = useState(null); // The currently viewed website
    const [siteScrapes, setSiteScrapes] = useState([]); // The thread of scrapes for the selected site

    // 1. Fetch all unique sites
    const fetchSites = async () => {
        try {
            const response = await fetch('http://127.0.0.1:5000/api/sites');
            if (response.ok) {
                const data = await response.json();
                setSites(data);
            }
        } catch (err) {
            console.error('Failed to fetch sites:', err);
        }
    };

    // 2. Fetch the thread of scrapes for a specific site
    const handleSiteClick = async (site) => {
        setSelectedSite(site);
        setResults(null); // Clear previous tags
        try {
            const response = await fetch(`http://127.0.0.1:5000/api/sites/${site.id}/scrapes`);
            if (response.ok) {
                const data = await response.json();
                setSiteScrapes(data);
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
            }
        } catch (err) {
            console.error('Failed to fetch site scrapes', err);
        }
    };

    // 3. Fetch the exact tags for a specific scrape run
    const handleRunClick = async (runId) => {
        try {
            const response = await fetch(`http://127.0.0.1:5000/api/scrape/${runId}`);
            if (response.ok) {
                const data = await response.json();
                setResults(data);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } catch (err) {
            console.error('Failed to fetch details', err);
        }
    };

    // 4. Delete a site (Admins & Super Admins only)
    const handleDeleteSite = async (e, id) => {
        e.stopPropagation(); // Prevent triggering the row click
        if (!window.confirm("Are you sure you want to delete this site and all its history?")) return;
        
        try {
            const response = await fetch(`http://127.0.0.1:5000/api/sites/${id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                if (selectedSite && selectedSite.id === id) {
                    setSelectedSite(null);
                    setSiteScrapes([]);
                    setResults(null);
                }
                fetchSites();
            }
        } catch (err) {
            console.error('Failed to delete site', err);
        }
    };

    // Initial load
    useEffect(() => {
        fetchSites();
    }, []);

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
            });
            const data = await response.json();
            if (response.ok) {
                setResults(data);
                fetchSites(); // Refresh sites list!
            } else {
                setError(data.message || 'Scraping failed');
            }
        } catch (err) {
            setError('Could not connect to Python server');
        } finally {
            setLoading(false);
        }
    };

    const tdStyle = { padding: '12px', border: '1px solid #ddd' };

    return (
        <div style={{ maxWidth: '900px', margin: '50px auto', fontFamily: 'sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <h2>Tag Fetcher Dashboard</h2>
                <div>
                    {roleId === 1 && (
                        <button onClick={() => navigate('/admin')} style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '10px' }}>Manage Users</button>
                    )}
                    <button onClick={handleLogout} style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Logout</button>
                </div>
            </div>

            {/* ONLY Admins and Super Admins can scrape new sites */}
            {(roleId === 1 || roleId === 2) && (
                <div style={{ marginTop: '30px', border: '1px solid #ccc', padding: '20px', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
                    <form onSubmit={handleScrape} style={{ display: 'flex', gap: '10px' }}>
                        <input type="url" placeholder="Enter website URL to scrape" value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            required style={{ flex: 1, padding: '12px', fontSize: '16px' }}
                        />
                        <button type="submit" disabled={loading} style={{ padding: '12px 24px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
                            {loading ? 'Scraping...' : 'Fetch Tags'}
                        </button>
                    </form>
                    {error && <p style={{ color: 'red', marginTop: '15px' }}>{error}</p>}
                </div>
            )}

            {/* Tags Display */}
            {results && (
                <div style={{ marginTop: '40px', padding: '30px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fff' }}>
                    <h3 style={{ marginTop: '0' }}>Scrape Results for {results.title}</h3>
                    <div style={{ marginTop: '20px' }}>
                        <strong>Meta title:</strong> {results.meta_title || 'N/A'}<br/>
                        <strong>Meta Description:</strong> {results.meta_description || 'N/A'}<br/>
                        <strong>Meta Keywords:</strong> {results.meta_keywords || 'N/A'}<br/>
                    </div>
                    <h4 style={{ marginTop: '30px' }}>H1 headings found:</h4>
                    <ul>
                        {results.headings?.h1?.length > 0 ? results.headings.h1.map((h1, index) => <li key={index}>{h1}</li>) : <li>No h1 found</li>}
                    </ul>
                </div>
            )}

            {/* Websites List */}
            <div style={{ marginTop: '40px' }}>
                <h2>All Tracked Websites</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                    <thead>
                        <tr style={{ background: '#343a40', color: 'white', textAlign: 'left' }}>
                            <th style={tdStyle}>ID</th>
                            <th style={tdStyle}>Website URL</th>
                            <th style={tdStyle}>First Added</th>
                            <th style={tdStyle}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sites.length > 0 ? sites.map((site) => (
                            <tr key={site.id} onClick={() => handleSiteClick(site)} style={{ backgroundColor: selectedSite?.id === site.id ? '#e9ecef' : '#fff', borderBottom: '1px solid #ddd', cursor: 'pointer' }}>
                                <td style={tdStyle}>{site.id}</td>
                                <td style={tdStyle}><a href={site.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>{site.url}</a></td>
                                <td style={tdStyle}>{new Date(site.created_at).toLocaleDateString()}</td>
                                <td style={tdStyle}>
                                    {(roleId === 1 || roleId === 2) ? (
                                        <button onClick={(e) => handleDeleteSite(e, site.id)} style={{ padding: '6px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
                                    ) : (
                                        <span style={{ color: '#6c757d', fontStyle: 'italic' }}>View Only</span>
                                    )}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="4" style={{ ...tdStyle, textAlign: 'center' }}>No websites tracked yet</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* The Thread View (Scrape History for the selected site) */}
            {selectedSite && (
                <div style={{ marginTop: '40px', padding: '20px', border: '2px solid #007bff', borderRadius: '8px', backgroundColor: '#f8f9fa' }}>
                    <h2 style={{ color: '#007bff', marginTop: 0 }}>Scrape History Thread: {selectedSite.url}</h2>
                    <p style={{ color: '#6c757d' }}>Click any run below to view the tags that were extracted on that date.</p>
                    
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                        <thead>
                            <tr style={{ background: '#e9ecef', textAlign: 'left' }}>
                                <th style={tdStyle}>Run ID</th>
                                <th style={tdStyle}>Status</th>
                                <th style={tdStyle}>Scraped Date & Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {siteScrapes.length > 0 ? siteScrapes.map((run) => (
                                <tr key={run.id} onClick={() => handleRunClick(run.id)} style={{ backgroundColor: '#fff', borderBottom: '1px solid #ddd', cursor: 'pointer' }}>
                                    <td style={tdStyle}>{run.id}</td>
                                    <td style={{ ...tdStyle, color: run.status === 'completed' ? 'green' : 'orange', fontWeight: 'bold' }}>{run.status.toUpperCase()}</td>
                                    <td style={tdStyle}>{new Date(run.started_at).toLocaleString()}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="3" style={{ ...tdStyle, textAlign: 'center' }}>No scrape history found for this site.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
