import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { formatDateTime } from '../utils/date';
import { downloadReport } from '../utils/download';

export default function Reports() {
    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [downloadingAll, setDownloadingAll] = useState(false);
    const [downloadingId, setDownloadingId] = useState(null);
    const navigate = useNavigate();

    const fetchSites = async () => {
        try {
            const res = await apiFetch('/api/sites');
            if (res.ok) {
                const data = await res.json();
                setSites(data);
            }
        } catch (err) {
            console.error('Failed to load sites:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSites();
    }, []);

    const handleDownloadAll = async () => {
        setDownloadingAll(true);
        await downloadReport('/api/reports/all', 'all_sites_scrape_report.csv');
        setDownloadingAll(false);
    };

    const handleDownloadSite = async (e, siteId, url) => {
        e.stopPropagation();
        setDownloadingId(siteId);
        const cleanHost = url.replace(/https?:\/\//, '').replace(/[\/\?#].*$/, '') || `site_${siteId}`;
        await downloadReport(`/api/sites/${siteId}/report`, `${cleanHost}_report.csv`);
        setDownloadingId(null);
    };

    return (
        <div className="reports-page-container fade-in">
            <div className="header" style={{ marginBottom: '28px' }}>
                <div>
                    <h2 className="card-title">Scrape Reports & Data Exports</h2>
                    <p className="text-muted">Export complete historical tag scrapes in CSV format for analysis.</p>
                </div>
                <button
                    onClick={handleDownloadAll}
                    disabled={downloadingAll || sites.length === 0}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    {downloadingAll ? 'Generating Export...' : 'Download All Sites Report (CSV)'}
                </button>
            </div>

            {/* Overview Banner */}
            <div className="card" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', padding: '24px 30px' }}>
                <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                        Tracked Sites Export Center
                    </h3>
                    <p className="text-muted" style={{ margin: 0, fontSize: '14px' }}>
                        You can download individual site reports or download the master aggregated CSV with all tracked sites.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--accent-color)' }}>
                            {sites.length}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Available Sites</div>
                    </div>
                </div>
            </div>

            {/* Sites Table */}
            <div className="card">
                <h3 className="card-title">Per-Site Reports</h3>
                <p className="text-muted mb-4">Select a site to download its full history or navigate to its full-page run logs.</p>

                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Website URL</th>
                                <th>Auto-Schedule</th>
                                <th>Last Scraped</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="text-center text-muted" style={{ padding: '36px' }}>Loading websites...</td>
                                </tr>
                            ) : sites.length > 0 ? (
                                sites.map((site) => (
                                    <tr 
                                        key={site.id} 
                                        onClick={() => navigate(`/sites/${site.id}`)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td>#{site.id}</td>
                                        <td style={{ fontWeight: 500 }}>
                                            <a href={site.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                                                {site.url}
                                            </a>
                                        </td>
                                        <td>
                                            <span className="badge">
                                                {site.cron_interval_hours ? `Every ${site.cron_interval_hours}h` : 'Manual'}
                                            </span>
                                        </td>
                                        <td className="text-muted" style={{ fontSize: '13px' }}>
                                            {site.last_scraped_at ? formatDateTime(site.last_scraped_at) : 'Never'}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    onClick={(e) => handleDownloadSite(e, site.id, site.url)}
                                                    disabled={downloadingId === site.id}
                                                    className="btn btn-secondary"
                                                    style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                                    title="Download this site's complete CSV report"
                                                >
                                                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                                        <polyline points="7 10 12 15 17 10"></polyline>
                                                        <line x1="12" y1="15" x2="12" y2="3"></line>
                                                    </svg>
                                                    {downloadingId === site.id ? 'Exporting...' : 'Download CSV'}
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/sites/${site.id}`);
                                                    }}
                                                    className="btn btn-secondary"
                                                    style={{ padding: '6px 12px', fontSize: '12px' }}
                                                >
                                                    View History →
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="text-center text-muted" style={{ padding: '36px' }}>No websites found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
