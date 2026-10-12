import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDateOnly } from '../utils/date';
import { API_BASE_URL } from '../config';

export default function Admin() {
    const [users, setUsers] = useState([]);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [roleId, setRoleId] = useState(3);
    const [message, setMessage] = useState('');
    const [intervalHours, setIntervalHours] = useState(24);
    const [cronMessage, setCronMessage] = useState('');
    const [triggering, setTriggering] = useState(false);
    const navigate = useNavigate();

    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/users`);
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            }
        } catch (err) {
            console.error('Failed to fetch users', err);
        }
    };

    const fetchCron = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/cron`);
            if (response.ok) {
                const data = await response.json();
                setIntervalHours(data.interval_hours);
            }
        } catch (err) {
            console.error('Failed to fetch cron settings', err);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchCron();
    }, []);

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/users`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, role_id: roleId })
                }
            );
            const data = await response.json();
            if (response.ok) {
                setMessage('User created successfully!');
                setEmail('');
                setPassword('');
                setRoleId(3);
                fetchUsers();
            } else {
                setMessage(data.message || 'Error creating user');
            }
        } catch (err) {
            setMessage('Failed to connect to backend.');
        }
    };

    const handleDeleteUser = async (id) => {
        if (!window.confirm("Are you sure you want to delete this user?")) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                setMessage('User deleted successfully.');
                fetchUsers();
            } else {
                setMessage('Failed to delete user.');
            }
        } catch (err) {
            console.error('Delete error', err);
        }
    };

    const handleChangePassword = async (id) => {
        const newPassword = window.prompt("enter new password for this user");
        if (!newPassword) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${id}/password`, {
                method: "PUT",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: newPassword })
            });
            const data = await response.json();
            if (response.ok) {
                alert(data.message);
            } else {
                alert(data.message || 'failed to update password');
            }
        }
        catch (err) {
            alert('error updating password');
        }
    };

    const handleUpdateCron = async (e) => {
        e.preventDefault();
        setCronMessage('');
        try {
            const response = await fetch(`${API_BASE_URL}/api/cron`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ interval_hours: Number(intervalHours) })
            });
            const data = await response.json();
            if (response.ok) {
                setCronMessage(data.message || 'Schedule updated successfully!');
            } else {
                setCronMessage(data.message || 'Failed to update schedule');
            }
        } catch (err) {
            setCronMessage('Failed to connect to backend.');
        }
    };

    const handleTriggerCron = async () => {
        setTriggering(true);
        setCronMessage('');
        try {
            const response = await fetch(`${API_BASE_URL}/api/cron/trigger`, {
                method: 'POST'
            });
            const data = await response.json();
            if (response.ok) {
                setCronMessage(data.message || 'Scraping triggered successfully!');
            } else {
                setCronMessage(data.message || 'Failed to trigger scraping');
            }
        } catch (err) {
            setCronMessage('Failed to connect to backend.');
        } finally {
            setTriggering(false);
        }
    };

    return (
        <div className="container fade-in">
            <div className="header">
                <div>
                    <h2 className="card-title">Super Admin Portal</h2>
                    <p className="text-muted">Manage system users and access levels</p>
                </div>
                <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
                    ← Back to Dashboard
                </button>
            </div>

            <div className="card fade-in">
                <h3 className="card-title">Create New User</h3>
                <p className="text-muted mb-4">Add a new admin or standard user to the system.</p>

                <form onSubmit={handleCreateUser} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <input
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        className="form-input"
                        style={{ flex: 1 }}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        className="form-input"
                        style={{ flex: 1 }}
                    />
                    <select
                        value={roleId}
                        onChange={e => setRoleId(parseInt(e.target.value))}
                        required
                        className="form-input"
                        style={{ flex: 1, cursor: 'pointer' }}
                    >
                        <option value={3}>Standard User</option>
                        <option value={2}>Admin</option>
                    </select>
                    <button type="submit" className="btn btn-success" style={{ padding: '12px 24px' }}>
                        Add User
                    </button>
                </form>
                {message && <p className={`mt-4 ${message.includes('successfully') ? 'text-success' : 'text-danger'}`}>{message}</p>}
            </div>

            <div className="card fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                    <div>
                        <h3 className="card-title" style={{ marginBottom: '4px' }}>Automated Scraping Schedule</h3>
                        <p className="text-muted" style={{ margin: 0 }}>Set how frequently background cron runs automatically to check all tracked websites for changes.</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleTriggerCron}
                        disabled={triggering}
                        className="btn btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        {triggering ? '⏳ Scraping All Sites...' : '⚡ Run Scraping Now'}
                    </button>
                </div>

                <form onSubmit={handleUpdateCron} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <label style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Run every:</label>
                    <input
                        type="number"
                        min="1"
                        max="720"
                        value={intervalHours}
                        onChange={e => setIntervalHours(e.target.value)}
                        required
                        className="form-input"
                        style={{ width: '120px' }}
                    />
                    <span style={{ color: 'var(--text-muted)' }}>hours</span>
                    <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px' }}>
                        Save Schedule
                    </button>
                </form>
                {cronMessage && <p className={`mt-4 ${cronMessage.includes('successfully') || cronMessage.includes('completed') ? 'text-success' : 'text-danger'}`}>{cronMessage}</p>}
            </div>

            <div className="card fade-in">
                <h3 className="card-title">User Directory</h3>
                <p className="text-muted mb-4">All registered users in the system.</p>

                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Date Added</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length > 0 ? users.map((user) => (
                                <tr key={user.id}>
                                    <td>{user.id}</td>
                                    <td style={{ fontWeight: 500 }}>{user.email}</td>
                                    <td>
                                        <span className={`badge ${user.role === 'super_admin' ? 'badge-warning' : 'badge-success'}`}>
                                            {user.role ? user.role.toUpperCase() : 'UNKNOWN'}
                                        </span>
                                    </td>
                                    <td className="text-muted">{formatDateOnly(user.created_at)}</td>
                                    <td>
                                        {user.role === 'super_admin' ? (
                                            <span className="text-muted" style={{ fontStyle: 'italic', fontSize: '14px' }}>Cannot Delete</span>
                                        ) : (
                                            <>
                                                <button 
                                                    onClick={() => handleChangePassword(user.id)} 
                                                    className="btn btn-secondary"
                                                    style={{ padding: '6px 12px', fontSize: '12px', marginRight: '8px' }}
                                                >
                                                    Change Password
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    className="btn btn-danger"
                                                    style={{ padding: '6px 12px', fontSize: '12px' }}
                                                >
                                                    Delete User
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="text-center text-muted" style={{ padding: '32px' }}>No users found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}