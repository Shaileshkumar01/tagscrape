import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

export default function EditUserModal({ user, isOpen, onClose, onSaved }) {
    if (!isOpen || !user) return null;

    const [name, setName] = useState(user.name || '');
    const [email, setEmail] = useState(user.email || '');
    const [roleId, setRoleId] = useState(user.role_id || 3);
    const [password, setPassword] = useState('');
    const [availableSites, setAvailableSites] = useState([]);
    const [selectedSiteIds, setSelectedSiteIds] = useState([]);
    const [searchFilter, setSearchFilter] = useState('');
    const [loadingSites, setLoadingSites] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        setName(user.name || '');
        setEmail(user.email || '');
        setRoleId(user.role_id || 3);
        setPassword('');
        setError('');

        const loadSitesAndAssignments = async () => {
            setLoadingSites(true);
            try {
                // Fetch all sites
                const sitesRes = await apiFetch('/api/sites');
                if (sitesRes.ok) {
                    const sitesData = await sitesRes.json();
                    setAvailableSites(sitesData);
                }

                // Fetch user's assigned sites
                const userSitesRes = await apiFetch(`/api/users/${user.id}/sites`);
                if (userSitesRes.ok) {
                    const data = await userSitesRes.json();
                    setSelectedSiteIds(data.site_ids || []);
                }
            } catch (err) {
                console.error('Error loading user site data:', err);
                setError('Failed to load website assignments');
            } finally {
                setLoadingSites(false);
            }
        };

        loadSitesAndAssignments();
    }, [user]);

    const handleToggleSite = (siteId) => {
        if (selectedSiteIds.includes(siteId)) {
            setSelectedSiteIds(selectedSiteIds.filter(id => id !== siteId));
        } else {
            setSelectedSiteIds([...selectedSiteIds, siteId]);
        }
    };

    const handleSelectAll = () => {
        const allIds = availableSites.map(s => s.id);
        setSelectedSiteIds(allIds);
    };

    const handleDeselectAll = () => {
        setSelectedSiteIds([]);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const body = {
                name: name.trim(),
                email: email.trim(),
                role_id: parseInt(roleId),
                site_ids: selectedSiteIds
            };
            if (password) {
                body.password = password;
            }

            const res = await apiFetch(`/api/users/${user.id}`, {
                method: 'PUT',
                body
            });
            const data = await res.json();

            if (res.ok) {
                onSaved(data.message || 'User updated successfully');
                onClose();
            } else {
                setError(data.message || 'Failed to update user');
            }
        } catch (err) {
            setError('Network error saving user');
        } finally {
            setSaving(false);
        }
    };

    const filteredSites = availableSites.filter(s => 
        s.url.toLowerCase().includes(searchFilter.toLowerCase())
    );

    return (
        <div className="modal-backdrop fade-in" onClick={onClose}>
            <div className="modal-dialog" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h3 className="modal-title">Edit User Profile</h3>
                        <p className="text-muted" style={{ margin: 0, fontSize: '13px' }}>
                            Update credentials, roles, and assigned website access.
                        </p>
                    </div>
                    <button className="modal-close-btn" onClick={onClose}>&times;</button>
                </div>

                {error && (
                    <div className="notification-banner error" style={{ margin: '16px 24px 0' }}>
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSave} className="modal-body">
                    {/* User Details */}
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <input
                                type="text"
                                className="form-input"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="User's display name"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Email Address *</label>
                            <input
                                type="email"
                                className="form-input"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">System Role *</label>
                            <select
                                className="form-input"
                                value={roleId}
                                disabled={user.id === 1}
                                onChange={e => setRoleId(parseInt(e.target.value))}
                                style={{ cursor: user.id === 1 ? 'not-allowed' : 'pointer' }}
                            >
                                <option value={3}>Standard User (Assigned Sites Only)</option>
                                <option value={2}>Admin (Can Add/Scrape Sites)</option>
                                <option value={1}>Super Admin (Full Management)</option>
                            </select>
                            {user.id === 1 && (
                                <span className="text-muted" style={{ fontSize: '11px', display: 'block', marginTop: '4px' }}>
                                    Primary Super Admin role is protected and cannot be changed.
                                </span>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Reset Password</label>
                            <input
                                type="password"
                                className="form-input"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Leave blank to keep current"
                            />
                        </div>
                    </div>

                    {/* Assigned Websites Checklist */}
                    <div className="sites-assignment-section">
                        <div className="assignment-header">
                            <div>
                                <label className="form-label" style={{ marginBottom: '2px' }}>
                                    Assigned Websites ({selectedSiteIds.length} of {availableSites.length} selected)
                                </label>
                                <span className="text-muted" style={{ fontSize: '12px' }}>
                                    Standard Users only have visibility and scrape access to assigned websites.
                                </span>
                            </div>
                            <div className="assignment-actions">
                                <button type="button" onClick={handleSelectAll} className="btn-link">Select All</button>
                                <span className="separator">|</span>
                                <button type="button" onClick={handleDeselectAll} className="btn-link">Clear</button>
                            </div>
                        </div>

                        {availableSites.length > 5 && (
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Filter websites by URL..."
                                value={searchFilter}
                                onChange={e => setSearchFilter(e.target.value)}
                                style={{ marginBottom: '12px', fontSize: '13px', padding: '8px 12px' }}
                            />
                        )}

                        <div className="checklist-container">
                            {loadingSites ? (
                                <div className="text-muted text-center" style={{ padding: '20px' }}>Loading websites...</div>
                            ) : filteredSites.length > 0 ? (
                                filteredSites.map((site) => {
                                    const isChecked = selectedSiteIds.includes(site.id);
                                    return (
                                        <label key={site.id} className={`checklist-item ${isChecked ? 'checked' : ''}`}>
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => handleToggleSite(site.id)}
                                            />
                                            <span className="checklist-site-url" title={site.url}>
                                                {site.url}
                                            </span>
                                            {site.cron_interval_hours && (
                                                <span className="badge" style={{ fontSize: '11px', padding: '2px 8px' }}>
                                                    {site.cron_interval_hours}h
                                                </span>
                                            )}
                                        </label>
                                    );
                                })
                            ) : (
                                <div className="text-muted text-center" style={{ padding: '20px' }}>
                                    No websites match filter.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="modal-footer">
                        <button type="button" onClick={onClose} className="btn btn-secondary" disabled={saving}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={saving} style={{ minWidth: '120px' }}>
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
