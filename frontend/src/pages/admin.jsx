import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Admin() {
    const [users, setUsers] = useState([]);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [roleId, setRoleId] = useState(3);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const fetchUsers = async () => {
        try {
            const response = await fetch('http://127.0.0.1:5000/api/users');
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
            const response = await fetch(
                'http://127.0.0.1:5000/api/users',
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
            const response = await fetch(`http://127.0.0.1:5000/api/users/${id}`, {
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
            const response = await fetch(`http://127.0.0.1:5000/api/users/${id}/password`, {
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
                                    <td className="text-muted">{new Date(user.created_at.replace('GMT', '')).toLocaleDateString()}</td>
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