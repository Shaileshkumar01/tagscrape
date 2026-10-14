import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/authcontext";
import { formatDateTime } from "../utils/date";
import { apiFetch } from "../utils/api";
import { downloadReport } from "../utils/download";

export default function Dashboard() {
    const { roleId } = useContext(AuthContext);
    const navigate = useNavigate();
    const [url, setUrl] = useState('');
    const [cronHours, setCronHours] = useState('');
    const [loading, setLoading] = useState(false);
    const [downloadingAll, setDownloadingAll] = useState(false);
    const [downloadingSiteId, setDownloadingSiteId] = useState(null);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [sites, setSites] = useState([]);

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

    useEffect(() => {
        fetchSites();
    }, []);

    const handleSiteClick = (siteId) => {
        navigate(`/sites/${siteId}`);
    };

    const handleDeleteSite = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this site and all its history?")) return;

        try {
            const response = await apiFetch(`/api/sites/${id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                fetchSites();
            } else {
                alert('Failed to delete site.');
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
            } else {
                alert(data.message || 'Scrape failed');
            }
        } catch (err) {
            alert('Scrape request failed');
        }
    };

    const handleDownloadAll = async () => {
        setDownloadingAll(true);
        await downloadReport('/api/reports/all', 'all_sites_scrape_report.csv');
        setDownloadingAll(false);
    };

    const handleDownloadSiteReport = async (e, siteId, siteUrl) => {
        e.stopPropagation();
        setDownloadingSiteId(siteId);
        const cleanHost = siteUrl.replace(/https?:\/\//, '').replace(/[\/\?#].*$/, '') || `site_${siteId}`;
        await downloadReport(`/api/sites/${siteId}/report`, `${cleanHost}_report.csv`);
        setDownloadingSiteId(null);
    };

    const handleScrape = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
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
                    setSuccessMessage('No changes detected since last scrape. Site registered.');
                } else {
                    setSuccessMessage('Website successfully scraped and registered!');
                }
                fetchSites();
                setUrl('');
                setCronHours('');
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
        <div className="dashboard-container fade-in">
            {/* Header */}
            <div className="header" style={{ marginBottom: '28px' }}>
                <div>
                    <h2 className="card-title">Dashboard Overview</h2>
                    <p className="text-muted">Monitor SEO meta tags, manage crawl frequencies, and view scrape history.</p>
                </div>
                <div className="header-actions">
                    <button
                        onClick={handleDownloadAll}
                        disabled={downloadingAll || sites.length === 0}
                        className="btn btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        title="Download aggregated CSV report for all tracked sites"
                    >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        {downloadingAll ? 'Exporting...' : 'Download All Sites (CSV)'}
                    </button>
                </div>
            </div>

            {/* Notification messages */}
            {successMessage && (
                <div className="notification-banner success mb-4">
                    <span>{successMessage}</span>
                    <button onClick={() => setSuccessMessage('')}>&times;</button>
                </div>
            )}
            {error && (
                <div className="notification-banner error mb-4">
                    <span>{error}</span>
                    <button onClick={() => setError('')}>&times;</button>
                </div>
            )}

            {/* Add Website Form */}
            {(roleId === 1 || roleId === 2) && (
                <div className="card fade-in">
                    <h3 className="card-title">Track New Website</h3>
                    <p className="text-muted mb-4">Enter a website URL and set its automated scraping interval.</p>
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
                            {loading ? 'Scraping...' : 'Add & Fetch Tags'}
                        </button>
                    </form>
                </div>
            )}

            {/* Tracked Websites Table */}
            <div className="card fade-in">
                <div className="card-header-flex">
                    <div>
                        <h3 className="card-title">Tracked Websites</h3>
                        <p className="text-muted" style={{ margin: 0, fontSize: '13px' }}>
                            Click any row to open the full-page scrape history thread and tag inspector.
                        </p>
                    </div>
                    <span className="badge badge-secondary">{sites.length} Websites</span>
                </div>

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
                                    onClick={() => handleSiteClick(site.id)}
                                    style={{ cursor: 'pointer' }}
                                    title="Click to view full scrape history thread"
                                >
                                    <td>#{site.id}</td>
                                    <td>
                                        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                                            {site.url}
                                        </span>
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
                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                            {(roleId === 1 || roleId === 2) && (
                                                <button
                                                    onClick={(e) => handleScrapeSiteNow(e, site)}
                                                    className="btn btn-secondary"
                                                    style={{ padding: '6px 10px', fontSize: '12px' }}
                                                    title="Scrape this website now"
                                                >
                                                    Scrape Now
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => handleDownloadSiteReport(e, site.id, site.url)}
                                                disabled={downloadingSiteId === site.id}
                                                className="btn btn-secondary"
                                                style={{ padding: '6px 10px', fontSize: '12px' }}
                                                title="Download complete history for this site in CSV"
                                            >
                                                CSV
                                            </button>
                                            {(roleId === 1 || roleId === 2) && (
                                                <button
                                                    onClick={(e) => handleDeleteSite(e, site.id)}
                                                    className="btn btn-danger"
                                                    style={{ padding: '6px 10px', fontSize: '12px' }}
                                                    title="Delete site"
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" className="text-center text-muted" style={{ padding: '36px' }}>
                                        No websites tracked yet. Add a website URL above.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
