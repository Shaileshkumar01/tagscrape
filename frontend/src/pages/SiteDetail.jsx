import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/authcontext';
import { apiFetch } from '../utils/api';
import { formatDateTime } from '../utils/date';
import { downloadReport } from '../utils/download';

export default function SiteDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { roleId } = useContext(AuthContext);

    const [site, setSite] = useState(null);
    const [runs, setRuns] = useState([]);
    const [selectedRunId, setSelectedRunId] = useState(null);
    const [runDetails, setRunDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [scraping, setScraping] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [activeTab, setActiveTab] = useState('meta');

    const fetchSiteInfo = async () => {
        try {
            const res = await apiFetch(`/api/sites/${id}`);
            if (res.ok) {
                const data = await res.json();
                setSite(data);
            } else if (res.status === 404 || res.status === 403) {
                setError('Website not found or access denied.');
            }
        } catch (err) {
            console.error('Error fetching site:', err);
            setError('Could not connect to backend.');
        }
    };

    const fetchRuns = async () => {
        try {
            const res = await apiFetch(`/api/sites/${id}/scrapes`);
            if (res.ok) {
                const data = await res.json();
                setRuns(data);
                // If there are runs and none selected yet, select the first (latest) run
                if (data.length > 0 && !selectedRunId) {
                    setSelectedRunId(data[0].id);
                    fetchRunDetails(data[0].id);
                }
            }
        } catch (err) {
            console.error('Error fetching runs:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchRunDetails = async (runId) => {
        try {
            const res = await apiFetch(`/api/scrape/${runId}`);
            if (res.ok) {
                const data = await res.json();
                setRunDetails(data);
            }
        } catch (err) {
            console.error('Error fetching run details:', err);
        }
    };

    useEffect(() => {
        setLoading(true);
        fetchSiteInfo();
        fetchRuns();
    }, [id]);

    const handleSelectRun = (runId) => {
        setSelectedRunId(runId);
        fetchRunDetails(runId);
    };

    const handleScrapeNow = async () => {
        setScraping(true);
        setSuccessMessage('');
        setError('');
        try {
            const res = await apiFetch(`/api/sites/${id}/scrape`, { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                if (data.unchanged) {
                    setSuccessMessage('Scrape completed. No changes detected since last run.');
                } else {
                    setSuccessMessage('Scrape successful! Fresh tags extracted and saved.');
                }
                fetchSiteInfo();
                fetchRuns();
            } else {
                setError(data.message || 'Scraping failed.');
            }
        } catch (err) {
            setError('Network error during scrape.');
        } finally {
            setScraping(false);
        }
    };

    const handleScheduleChange = async (newInterval) => {
        const intervalValue = newInterval ? parseInt(newInterval) : null;
        try {
            const res = await apiFetch(`/api/sites/${id}/schedule`, {
                method: 'PUT',
                body: { cron_interval_hours: intervalValue }
            });
            if (res.ok) {
                fetchSiteInfo();
                setSuccessMessage('Schedule frequency updated.');
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                alert('Failed to update schedule');
            }
        } catch (err) {
            alert('Error updating schedule');
        }
    };

    const handleDeleteSite = async () => {
        if (!window.confirm('Are you sure you want to delete this website and all of its scrape history?')) {
            return;
        }
        try {
            const res = await apiFetch(`/api/sites/${id}`, { method: 'DELETE' });
            if (res.ok) {
                navigate('/dashboard');
            } else {
                const data = await res.json();
                alert(data.message || 'Failed to delete site.');
            }
        } catch (err) {
            alert('Error deleting site.');
        }
    };

    const handleDownloadSiteReport = async () => {
        setDownloading(true);
        await downloadReport(`/api/sites/${id}/report`, `site_${id}_history_report.csv`);
        setDownloading(false);
    };

    const handleDownloadRunReport = async (e, runId) => {
        e.stopPropagation();
        await downloadReport(`/api/scrape/${runId}/report`, `scrape_run_${runId}_report.csv`);
    };

    if (loading && !site) {
        return (
            <div className="detail-page-container">
                <div className="card text-center text-muted" style={{ padding: '60px' }}>
                    Loading website details...
                </div>
            </div>
        );
    }

    if (error && !site) {
        return (
            <div className="detail-page-container">
                <div className="card text-center" style={{ padding: '60px' }}>
                    <h3 className="text-danger mb-4">{error}</h3>
                    <Link to="/dashboard" className="btn btn-secondary">
                        ← Back to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="detail-page-container fade-in">
            {/* Top Navigation & Breadcrumbs */}
            <div className="site-detail-nav">
                <div className="breadcrumbs">
                    <Link to="/dashboard" className="breadcrumb-link">Dashboard</Link>
                    <span className="breadcrumb-separator">/</span>
                    <span className="breadcrumb-current">Site Scrape History</span>
                </div>
                <div className="site-detail-actions">
                    {(roleId === 1 || roleId === 2) && (
                        <button 
                            onClick={handleScrapeNow} 
                            disabled={scraping}
                            className="btn btn-primary"
                            style={{ minWidth: '130px' }}
                        >
                            {scraping ? 'Scraping...' : 'Scrape Now'}
                        </button>
                    )}
                    <button 
                        onClick={handleDownloadSiteReport}
                        disabled={downloading}
                        className="btn btn-secondary"
                        title="Download complete history for this site in CSV"
                    >
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Download Site CSV
                    </button>
                    {(roleId === 1 || roleId === 2) && (
                        <button 
                            onClick={handleDeleteSite} 
                            className="btn btn-danger"
                            title="Delete this website and history"
                        >
                            Delete
                        </button>
                    )}
                </div>
            </div>

            {/* Notifications */}
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

            {/* Site Hero Card */}
            <div className="card site-hero-card">
                <div className="site-hero-header">
                    <div>
                        <div className="site-url-badge">TRACKED WEBSITE</div>
                        <h1 className="site-hero-url">
                            <a href={site?.url} target="_blank" rel="noopener noreferrer">
                                {site?.url}
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '8px' }}>
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                    <polyline points="15 3 21 3 21 9"></polyline>
                                    <line x1="10" y1="14" x2="21" y2="3"></line>
                                </svg>
                            </a>
                        </h1>
                    </div>
                    <div className="site-status-pill">
                        <span className="status-dot"></span>
                        {site?.status?.toUpperCase() || 'ACTIVE'}
                    </div>
                </div>

                <div className="site-meta-grid">
                    <div className="meta-item">
                        <span className="meta-label">Auto-Scrape Frequency</span>
                        {(roleId === 1 || roleId === 2) ? (
                            <select
                                value={site?.cron_interval_hours || ''}
                                onChange={(e) => handleScheduleChange(e.target.value)}
                                className="form-input meta-select"
                            >
                                <option value="">Manual Only</option>
                                <option value="1">Every 1 hour</option>
                                <option value="6">Every 6 hours</option>
                                <option value="12">Every 12 hours</option>
                                <option value="24">Every 24 hours (Daily)</option>
                                <option value="168">Weekly (7 days)</option>
                            </select>
                        ) : (
                            <span className="meta-value">
                                {site?.cron_interval_hours ? `Every ${site.cron_interval_hours}h` : 'Manual'}
                            </span>
                        )}
                    </div>

                    <div className="meta-item">
                        <span className="meta-label">Last Scraped</span>
                        <span className="meta-value">
                            {site?.last_scraped_at ? formatDateTime(site.last_scraped_at) : 'Never'}
                        </span>
                    </div>

                    <div className="meta-item">
                        <span className="meta-label">Next Scheduled Run</span>
                        <span className="meta-value">
                            {site?.cron_interval_hours && site?.next_scrape_at 
                                ? formatDateTime(site.next_scrape_at) 
                                : 'Not scheduled'}
                        </span>
                    </div>

                    <div className="meta-item">
                        <span className="meta-label">Total Recorded Scrapes</span>
                        <span className="meta-value highlight-num">
                            {runs.length}
                        </span>
                    </div>
                </div>
            </div>

            {/* Split Grid: Scrape Runs Table & Tag Inspector */}
            <div className="site-details-grid">
                {/* Runs Column */}
                <div className="card runs-card">
                    <div className="card-header-flex">
                        <h3 className="card-title">Run History</h3>
                        <span className="badge badge-secondary">{runs.length} Runs</span>
                    </div>
                    <p className="text-muted mb-4" style={{ fontSize: '13px' }}>
                        Click a run below to inspect its extracted tags.
                    </p>

                    <div className="table-container runs-table-wrap">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Run ID</th>
                                    <th>Status</th>
                                    <th>Timestamp</th>
                                    <th>Export</th>
                                </tr>
                            </thead>
                            <tbody>
                                {runs.length > 0 ? (
                                    runs.map((run) => (
                                        <tr
                                            key={run.id}
                                            onClick={() => handleSelectRun(run.id)}
                                            className={selectedRunId === run.id ? 'selected' : ''}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <td style={{ fontWeight: 600 }}>#{run.id}</td>
                                            <td>
                                                <span className={`badge ${run.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                                                    {run.status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="text-muted" style={{ fontSize: '12px' }}>
                                                {formatDateTime(run.started_at)}
                                            </td>
                                            <td>
                                                <button
                                                    onClick={(e) => handleDownloadRunReport(e, run.id)}
                                                    className="btn-icon"
                                                    title="Download this run's tags as CSV"
                                                >
                                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                                        <polyline points="7 10 12 15 17 10"></polyline>
                                                        <line x1="12" y1="15" x2="12" y2="3"></line>
                                                    </svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="text-center text-muted" style={{ padding: '36px' }}>
                                            No scrape runs recorded yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Tag Inspector Column */}
                <div className="card inspector-card">
                    {runDetails ? (
                        <div className="fade-in">
                            <div className="inspector-header">
                                <div>
                                    <h3 className="card-title">Run #{runDetails.run_id} Tags</h3>
                                    <p className="text-muted" style={{ fontSize: '13px' }}>
                                        Extracted at {formatDateTime(runDetails.started_at)}
                                    </p>
                                </div>
                                <button
                                    onClick={(e) => handleDownloadRunReport(e, runDetails.run_id)}
                                    className="btn btn-secondary"
                                    style={{ padding: '6px 12px', fontSize: '12px' }}
                                >
                                    Download CSV
                                </button>
                            </div>

                            {/* Inspector Navigation Tabs */}
                            <div className="inspector-tabs">
                                <button
                                    type="button"
                                    className={`inspector-tab-btn ${activeTab === 'meta' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('meta')}
                                >
                                    SEO & Meta Tags
                                </button>
                                <button
                                    type="button"
                                    className={`inspector-tab-btn ${activeTab === 'headings' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('headings')}
                                >
                                    Headings ({
                                        runDetails.headings 
                                            ? Object.values(runDetails.headings).reduce((acc, l) => acc + (l?.length || 0), 0)
                                            : 0
                                    })
                                </button>
                                <button
                                    type="button"
                                    className={`inspector-tab-btn ${activeTab === 'raw' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('raw')}
                                >
                                    All Tags Table ({runDetails.all_tags?.length || 0})
                                </button>
                            </div>

                            {/* Tab 1: SEO & Meta Tags */}
                            {activeTab === 'meta' && (
                                <div className="fade-in">
                                    <div className="inspector-section">
                                        <label className="form-label" style={{ fontWeight: 600, color: 'var(--accent-color)' }}>
                                            Page Title (&lt;title&gt;)
                                        </label>
                                        <div className="tag-content-box" style={{ fontWeight: 500 }}>
                                            {runDetails.title || <span className="text-muted">Not Found</span>}
                                        </div>
                                    </div>

                                    <div className="inspector-section">
                                        <label className="form-label">Meta Title (name/og/twitter)</label>
                                        <div className="tag-content-box">
                                            {runDetails.meta_title || <span className="text-muted">Not Found</span>}
                                        </div>
                                    </div>

                                    <div className="inspector-section">
                                        <label className="form-label">Meta Description</label>
                                        <div className="tag-content-box">
                                            {runDetails.meta_description || <span className="text-muted">Not Found</span>}
                                        </div>
                                    </div>

                                    <div className="inspector-section">
                                        <label className="form-label">Meta Keywords</label>
                                        <div className="tag-content-box">
                                            {runDetails.meta_keywords || <span className="text-muted">Not Found</span>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tab 2: All Headings (H1 to H6) */}
                            {activeTab === 'headings' && (
                                <div className="fade-in">
                                    {['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((level) => {
                                        const list = runDetails.headings?.[level] || [];
                                        if (list.length === 0) return null;
                                        return (
                                            <div className="inspector-section" key={level}>
                                                <label className="form-label" style={{ textTransform: 'uppercase', color: 'var(--accent-color)' }}>
                                                    {level} Headings ({list.length})
                                                </label>
                                                <ul className="tag-list">
                                                    {list.map((h, i) => (
                                                        <li key={i}>{h}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        );
                                    })}
                                    {(!runDetails.headings || Object.values(runDetails.headings).every(l => !l || l.length === 0)) && (
                                        <div className="tag-content-box text-muted">
                                            No headings (H1–H6) found on this page.
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Tab 3: All Extracted Tags Table */}
                            {activeTab === 'raw' && (
                                <div className="fade-in table-container" style={{ maxHeight: '450px', overflowY: 'auto', marginTop: 0 }}>
                                    <table className="data-table raw-tags-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '40px' }}>#</th>
                                                <th style={{ width: '110px' }}>Tag Name</th>
                                                <th style={{ width: '90px' }}>Type</th>
                                                <th>Content</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {runDetails.all_tags?.length > 0 ? (
                                                runDetails.all_tags.map((t, idx) => (
                                                    <tr key={idx}>
                                                        <td className="text-muted">{idx + 1}</td>
                                                        <td style={{ fontWeight: 600, color: 'var(--accent-color)' }}>{t.tag_name}</td>
                                                        <td>
                                                            <span className="badge badge-secondary" style={{ fontSize: '11px', padding: '2px 8px' }}>
                                                                {t.tag_type}
                                                            </span>
                                                        </td>
                                                        <td style={{ wordBreak: 'break-word', color: 'var(--text-primary)', fontSize: '13px' }}>
                                                            {t.content}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="4" className="text-center text-muted" style={{ padding: '24px' }}>
                                                        No tag records available.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="inspector-empty">
                            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-muted mb-4">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                            <p className="text-muted">Select a scrape run from the list to inspect extracted tags.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
