import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDateOnly } from '../utils/date';
import { apiFetch } from '../utils/api';
import EditUserModal from '../components/EditUserModal';

export default function Admin() {
    const [users, setUsers] = useState([]);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [roleId, setRoleId] = useState(3);
    const [message, setMessage] = useState('');
    const [editingUser, setEditingUser] = useState(null);
    const [searchUser, setSearchUser] = useState('');
    const navigate = useNavigate();

    const fetchUsers = async () => {
        try {
            const response = await apiFetch('/api/users');
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            }
        } catch (err) {
            console.error('Failed to fetch users', err);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            const response = await apiFetch('/api/users', {
                method: 'POST',
                body: { 
                    name: name.trim() || undefined,
                    email: email.trim(), 
                    password, 
                    role_id: roleId 
                }
            });
            const data = await response.json();
            if (response.ok) {
                setMessage('User created successfully!');
                setName('');
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
            const response = await apiFetch(`/api/users/${id}`, {
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

    const handleUserSaved = (msg) => {
        setMessage(msg);
        fetchUsers();
        setTimeout(() => setMessage(''), 4000);
    };

    const filteredUsers = users.filter(u => 
        (u.email?.toLowerCase().includes(searchUser.toLowerCase())) ||
        (u.name?.toLowerCase().includes(searchUser.toLowerCase()))
    );

    return (
        <div className="admin-page-container fade-in">
            <div className="header" style={{ marginBottom: '28px' }}>
                <div>
                    <h2 className="card-title">User Management</h2>
                    <p className="text-muted">Manage system users, assign roles, and configure website access permissions.</p>
                </div>
            </div>

            {message && (
                <div className={`notification-banner ${message.includes('successfully') ? 'success' : 'error'} mb-4`}>
                    <span>{message}</span>
                    <button onClick={() => setMessage('')}>&times;</button>
                </div>
            )}

            {/* Create User Card */}
            <div className="card fade-in">
                <h3 className="card-title">Add New User</h3>
                <p className="text-muted mb-4">Provision a new account with standard or administrator privileges.</p>

                <form onSubmit={handleCreateUser} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <input
                        type="text"
                        placeholder="Full Name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="form-input"
                        style={{ flex: 1, minWidth: '160px' }}
                    />
                    <input
                        type="email"
                        placeholder="Email Address *"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        className="form-input"
                        style={{ flex: 1.5, minWidth: '200px' }}
                    />
                    <input
                        type="password"
                        placeholder="Password *"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        className="form-input"
                        style={{ flex: 1, minWidth: '150px' }}
                    />
                    <select
                        value={roleId}
                        onChange={e => setRoleId(parseInt(e.target.value))}
                        required
                        className="form-input"
                        style={{ flex: 1, minWidth: '150px', cursor: 'pointer' }}
                    >
                        <option value={3}>Standard User</option>
                        <option value={2}>Admin</option>
                        <option value={1}>Super Admin</option>
                    </select>
                    <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px', minWidth: '120px' }}>
                        Create User
                    </button>
                </form>
            </div>

            {/* User Directory */}
            <div className="card fade-in">
                <div className="card-header-flex">
                    <div>
                        <h3 className="card-title">User Directory</h3>
                        <p className="text-muted" style={{ margin: 0, fontSize: '13px' }}>
                            View and edit accounts, roles, passwords, and assigned websites.
                        </p>
                    </div>
                    {users.length > 5 && (
                        <input
                            type="text"
                            placeholder="Filter by name or email..."
                            value={searchUser}
                            onChange={e => setSearchUser(e.target.value)}
                            className="form-input"
                            style={{ width: '220px', padding: '6px 12px', fontSize: '13px' }}
                        />
                    )}
                </div>

                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>User</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                                <tr key={user.id}>
                                    <td>#{user.id}</td>
                                    <td>
                                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                                            {user.name || user.email?.split('@')[0]}
                                        </div>
                                    </td>
                                    <td className="text-muted" style={{ fontSize: '13px' }}>
                                        {user.email}
                                    </td>
                                    <td>
                                        <span className={`badge ${user.role === 'super_admin' ? 'badge-warning' : user.role === 'admin' ? 'badge-primary' : 'badge-success'}`}>
                                            {user.role ? user.role.toUpperCase() : 'USER'}
                                        </span>
                                    </td>
                                    <td className="text-muted" style={{ fontSize: '12px' }}>
                                        {formatDateOnly(user.created_at)}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button 
                                                onClick={() => setEditingUser(user)} 
                                                className="btn btn-secondary"
                                                style={{ padding: '6px 12px', fontSize: '12px' }}
                                                title="Edit user details, roles, password and assigned sites"
                                            >
                                                Edit User
                                            </button>
                                            {user.id !== 1 && (
                                                <button
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    className="btn btn-danger"
                                                    style={{ padding: '6px 12px', fontSize: '12px' }}
                                                    title="Delete this user account"
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
                                        No users found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit User Modal */}
            <EditUserModal
                user={editingUser}
                isOpen={!!editingUser}
                onClose={() => setEditingUser(null)}
                onSaved={handleUserSaved}
            />
        </div>
    );
}