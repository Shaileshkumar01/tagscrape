import { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/authcontext';

export default function Sidebar({ isOpen, onClose }) {
    const { user, roleId, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getRoleName = () => {
        if (roleId === 1) return 'Super Admin';
        if (roleId === 2) return 'Admin';
        return 'Standard User';
    };

    return (
        <>
            {/* Mobile backdrop */}
            <div 
                className={`sidebar-backdrop ${isOpen ? 'active' : ''}`}
                onClick={onClose}
            />

            <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
                {/* Brand / Logo */}
                <div className="sidebar-brand">
                    <span className="brand-title">Tag Fetcher</span>
                    {onClose && (
                        <button className="sidebar-close-mobile" onClick={onClose} title="Close menu">
                            ✕
                        </button>
                    )}
                </div>

                {/* Nav Links */}
                <nav className="sidebar-nav">
                    <div className="nav-group-label">NAVIGATION</div>

                    <NavLink 
                        to="/dashboard" 
                        end
                        onClick={onClose}
                        className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                    >
                        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="7" height="7"></rect>
                            <rect x="14" y="3" width="7" height="7"></rect>
                            <rect x="14" y="14" width="7" height="7"></rect>
                            <rect x="3" y="14" width="7" height="7"></rect>
                        </svg>
                        <span>Dashboard</span>
                    </NavLink>

                    <NavLink 
                        to="/reports" 
                        onClick={onClose}
                        className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                    >
                        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                        <span>Reports & Exports</span>
                    </NavLink>

                    {roleId === 1 && (
                        <>
                            <div className="nav-group-label" style={{ marginTop: '20px' }}>ADMINISTRATION</div>
                            <NavLink 
                                to="/admin" 
                                onClick={onClose}
                                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                            >
                                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="9" cy="7" r="4"></circle>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                </svg>
                                <span>User Management</span>
                            </NavLink>
                        </>
                    )}
                </nav>

                {/* Footer User Info & Logout */}
                <div className="sidebar-footer">
                    <div className="user-profile-card">
                        <div className="user-avatar">
                            {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="user-info">
                            <div className="user-name" title={user?.name || user?.email}>
                                {user?.name || user?.email?.split('@')[0]}
                            </div>
                            <div className="user-role-badge">
                                {getRoleName()}
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={handleLogout} 
                        className="btn-sidebar-logout"
                        title="Sign Out"
                    >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                            <polyline points="16 17 21 12 16 7"></polyline>
                            <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
