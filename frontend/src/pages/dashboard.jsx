import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/authcontext";

export default function Dashboard() {
    const { logout, roleId } = useContext(AuthContext);
    const navigate = useNavigate();
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState('');

    const [sites, setSites] = useState([]);
    const [selectedSite, setSelectedSite] = useState(null);
    const [siteScrapes, setSiteScrapes] = useState([]);

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

    const handleSiteClick = async (site) => {
        setSelectedSite(site);
        setResults(null);
        try {
            const response = await fetch(`http://127.0.0.1:5000/api/sites/${site.id}/scrapes`);
            if (response.ok) {
                const data = await response.json();
                setSiteScrapes(data);
            }
        } catch (err) {
            console.error('Failed to fetch site scrapes', err);
        }
    };

    const handleRunClick = async (runId) => {
        try {
            const response = await fetch(`http://127.0.0.1:5000/api/scrape/${runId}`);
            if (response.ok) {
                const data = await response.json();
                setResults(data);
            }
        } catch (err) {
            console.error('Failed to fetch details', err);
        }
    };

    const closeSidePanel = () => {
        setSelectedSite(null);
        setResults(null);
        setSiteScrapes([]);
    };

    const handleDeleteSite = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this site and all its history?")) return;

        try {
            const response = await fetch(`http://127.0.0.1:5000/api/sites/${id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                if (selectedSite && selectedSite.id === id) {
                    closeSidePanel();
                }
                fetchSites();
            }
        } catch (err) {
            console.error('Failed to delete site', err);
        }
    };

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
                if (data.unchanged) {
                    alert('No changes detected since the last scrape. Database was not updated.');
                }
                setResults(data.results || data);
                fetchSites();
                setUrl('');
                // Optionally open the side panel to show the new result immediately
                // but let's just refresh the list for now.
            } else {
                setError(data.message || 'Scraping failed');
            }
        } catch (err) {
            setError('Could not connect to Python server');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="container fade-in">
                <div className="header">
                    <div>
                        <h2 className="card-title">Tag Fetcher</h2>
                        <p className="text-muted">Dashboard & Overview</p>
                    </div>
                    <div className="header-actions">
                        {roleId === 1 && (
                            <button onClick={() => navigate('/admin')} className="btn btn-secondary">Manage Users</button>
                        )}
                        <button onClick={handleLogout} className="btn btn-danger">Logout</button>
                    </div>
                </div>

                {(roleId === 1 || roleId === 2) && (
                    <div className="card fade-in">
                        <h3 className="card-title">Fetch New Tags</h3>
                        <p className="text-muted mb-4">Enter a URL to scrape its SEO meta tags and headings.</p>
                        <form onSubmit={handleScrape} style={{ display: 'flex', gap: '12px' }}>
                            <input
                                type="url"
                                className="form-input"
                                placeholder="https://example.com"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                required
                                style={{ flex: 1 }}
                            />
                            <button type="submit" className="btn btn-primary" disabled={loading} style={{ minWidth: '140px' }}>
                                {loading ? 'Scraping...' : 'Fetch Tags'}
                            </button>
                        </form>
                        {error && <p className="text-danger mt-4">{error}</p>}
                    </div>
                )}

                <div className="card fade-in">
                    <h3 className="card-title">All Tracked Websites</h3>
                    <p className="text-muted mb-4">Click any website to view its scrape history thread in the side panel.</p>

                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Website URL</th>
                                    <th>First Added</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sites.length > 0 ? sites.map((site) => (
                                    <tr
                                        key={site.id}
                                        onClick={() => handleSiteClick(site)}
                                        className={selectedSite?.id === site.id ? 'selected' : ''}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td>{site.id}</td>
                                        <td>
                                            <a href={site.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>{site.url}</a>
                                        </td>
                                        <td className="text-muted">{new Date(site.created_at.replace('GMT', '')).toLocaleDateString()}</td>
                                        <td>
                                            {(roleId === 1 || roleId === 2) ? (
                                                <button onClick={(e) => handleDeleteSite(e, site.id)} className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '12px' }}>Delete</button>
                                            ) : (
                                                <span className="badge">View Only</span>
                                            )}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="4" className="text-center text-muted" style={{ padding: '32px' }}>No websites tracked yet</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>


            {/* Side Panel Overlay */}
            <div className={`side-panel-overlay ${selectedSite ? 'open' : ''}`} onClick={closeSidePanel}></div>

            {/* Sliding Side Panel */}
            <div className={`side-panel ${selectedSite ? 'open' : ''}`}>
                {selectedSite && (
                    <>
                        <div className="side-panel-header">
                            <div>
                                <h3 className="card-title" style={{ color: 'var(--accent-color)' }}>{selectedSite.url}</h3>
                                <p className="text-muted">Scrape History Thread</p>
                            </div>
                            <button className="close-btn" onClick={closeSidePanel}>&times;</button>
                        </div>

                        <div className="side-panel-content">
                            <p className="text-muted mb-4">Click any run below to view the exact tags extracted on that date.</p>

                            <div className="table-container" style={{ marginTop: 0, marginBottom: '24px' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Run ID</th>
                                            <th>Status</th>
                                            <th>Scraped Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {siteScrapes.length > 0 ? siteScrapes.map((run) => (
                                            <tr
                                                key={run.id}
                                                onClick={() => handleRunClick(run.id)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <td>{run.id}</td>
                                                <td>
                                                    <span className={`badge ${run.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                                                        {run.status.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="text-muted" style={{ fontSize: '13px' }}>
                                                    {new Date(run.started_at.replace('GMT', '')).toLocaleString()}
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="3" className="text-center text-muted" style={{ padding: '32px' }}>No scrape history found for this site.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Show specific tags inside the side panel when a run is clicked */}
                            {results && (
                                <div className="fade-in" style={{ padding: '20px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: '#000' }}>
                                    <h4 className="card-title mb-4" style={{ fontSize: '16px' }}>Extracted Tags</h4>

                                    <div className="form-group">
                                        <span className="form-label">Meta Title</span>
                                        <div style={{ color: 'var(--text-primary)', background: 'var(--surface-color)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                            {results.meta_title || 'N/A'}
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <span className="form-label">Meta Description</span>
                                        <div style={{ color: 'var(--text-primary)', background: 'var(--surface-color)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                            {results.meta_description || 'N/A'}
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <span className="form-label">Meta Keywords</span>
                                        <div style={{ color: 'var(--text-primary)', background: 'var(--surface-color)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                            {results.meta_keywords || 'N/A'}
                                        </div>
                                    </div>

                                    <h4 className="card-title mt-8" style={{ fontSize: '16px' }}>H1 Headings</h4>
                                    <ul className="tag-list">
                                        {results.headings?.h1?.length > 0 ? results.headings.h1.map((h1, index) => <li key={index}>{h1}</li>) : <li style={{ color: 'var(--text-secondary)' }}>No h1 tags found</li>}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
