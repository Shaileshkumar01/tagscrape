import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/authcontext";
import { formatDateTime, formatDateOnly } from "../utils/date";
import { apiFetch } from "../utils/api";

export default function Dashboard() {
    const { logout, roleId } = useContext(AuthContext);
    const navigate = useNavigate();
    const [url, setUrl] = useState('');
    const [cronHours, setCronHours] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState('');

    const [sites, setSites] = useState([]);
    const [selectedSite, setSelectedSite] = useState(null);
    const [siteScrapes, setSiteScrapes] = useState([]);

    const fetchSites = async () => {
        try {
            const response = await apiFetch('/api/sites');
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
            const response = await apiFetch(`/api/sites/${site.id}/scrapes`);
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
            const response = await apiFetch(`/api/scrape/${runId}`);
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
            const response = await apiFetch(`/api/sites/${id}`, {
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

    const handleScheduleChange = async (e, siteId) => {
        e.stopPropagation();
        const newInterval = e.target.value ? parseInt(e.target.value) : null;
        try {
            const response = await apiFetch(`/api/sites/${siteId}/schedule`, {
                method: 'PUT',
                body: { cron_interval_hours: newInterval }
            });
            if (response.ok) {
                fetchSites();
            } else {
                alert('Failed to update schedule');
            }
        } catch (err) {
            console.error('Failed to update schedule', err);
        }
    };

    const handleScrapeSiteNow = async (e, site) => {
        e.stopPropagation();
        try {
            const response = await apiFetch(`/api/sites/${site.id}/scrape`, {
                method: 'POST'
            });
            const data = await response.json();
            if (response.ok) {
                if (data.unchanged) {
                    alert(`No changes detected for ${site.url}`);
                } else {
                    alert(`Scrape completed! Updates saved for ${site.url}`);
                }
                fetchSites();
                if (selectedSite?.id === site.id) {
                    handleSiteClick(site);
                }
            } else {
                alert(data.message || 'Scrape failed');
            }
        } catch (err) {
            alert('Scrape request failed');
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
            const response = await apiFetch('/api/scrape', {
                method: 'POST',
                body: {
                    url,
                    cron_interval_hours: cronHours ? parseInt(cronHours) : null
                }
            });
            const data = await response.json();
            if (response.ok) {
                if (data.unchanged) {
                    alert('No changes detected since the last scrape. Database was not updated.');
                }
                setResults(data.results || data);
                fetchSites();
                setUrl('');
                setCronHours('');
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
                        <form onSubmit={handleScrape} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <input
                                type="url"
                                className="form-input"
                                placeholder="https://example.com"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                required
                                style={{ flex: 2, minWidth: '240px' }}
                            />
                            <select
                                className="form-input"
                                value={cronHours}
                                onChange={(e) => setCronHours(e.target.value)}
                                style={{ flex: 1, minWidth: '180px', cursor: 'pointer' }}
                            >
                                <option value="">Manual Only</option>
                                <option value="1">Every 1 hour</option>
                                <option value="6">Every 6 hours</option>
                                <option value="12">Every 12 hours</option>
                                <option value="24">Every 24 hours (Daily)</option>
                                <option value="168">Weekly (7 days)</option>
                            </select>
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
                                    <th>Auto-Scrape Schedule</th>
                                    <th>Last Scraped</th>
                                    <th>Next Run</th>
                                    <th>Actions</th>
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
                                            <a href={site.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ fontWeight: 500 }}>
                                                {site.url}
                                            </a>
                                        </td>
                                        <td>
                                            {(roleId === 1 || roleId === 2) ? (
                                                <select
                                                    value={site.cron_interval_hours || ''}
                                                    onClick={e => e.stopPropagation()}
                                                    onChange={e => handleScheduleChange(e, site.id)}
                                                    className="form-input"
                                                    style={{ padding: '6px 10px', fontSize: '13px', width: 'auto', cursor: 'pointer' }}
                                                >
                                                    <option value="">Manual Only</option>
                                                    <option value="1">Every 1 hr</option>
                                                    <option value="6">Every 6 hrs</option>
                                                    <option value="12">Every 12 hrs</option>
                                                    <option value="24">Every 24 hrs</option>
                                                    <option value="168">Weekly (7d)</option>
                                                </select>
                                            ) : (
                                                <span className="badge">
                                                    {site.cron_interval_hours ? `Every ${site.cron_interval_hours}h` : 'Manual'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="text-muted" style={{ fontSize: '13px' }}>
                                            {site.last_scraped_at ? formatDateTime(site.last_scraped_at) : 'Never'}
                                        </td>
                                        <td className="text-muted" style={{ fontSize: '13px' }}>
                                            {site.cron_interval_hours && site.next_scrape_at ? formatDateTime(site.next_scrape_at) : '-'}
                                        </td>
                                        <td>
                                            {(roleId === 1 || roleId === 2) ? (
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        onClick={(e) => handleScrapeSiteNow(e, site)}
                                                        className="btn btn-secondary"
                                                        style={{ padding: '6px 10px', fontSize: '12px' }}
                                                        title="Scrape this website now"
                                                    >
                                                        Scrape Now
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDeleteSite(e, site.id)}
                                                        className="btn btn-danger"
                                                        style={{ padding: '6px 10px', fontSize: '12px' }}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="badge">View Only</span>
                                            )}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="6" className="text-center text-muted" style={{ padding: '32px' }}>No websites tracked yet</td>
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
                                                    {formatDateTime(run.started_at)}
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
