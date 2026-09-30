import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

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
        }
        catch (err) {
            console.error("failed to fetch users");
        }
    };


    useEffect(() => {
        fetchUsers();
    }, []);



    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('http://127.0.0.1:5000/api/users',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, role_id: roleId })
                }
            );
            const data = await response.json();
            setMessage(data.message);

            if (response.ok) {
                setEmail('');
                setPassword('');
                fetchUsers();
            }
        }
        catch (err) {
            console.error("failed to connect to python server");
        }
    };


    const handleDeleteUser = async (id) => {
        if (!window.confirm("are you sure you want to delete this user?")) return;
        try {
            const response = await fetch(`http://127.0.0.1:5000/api/users/${id}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            setMessage(data.message);
            if (response.ok) {
                fetchUsers();
            }
        }
        catch (err) {
            console.error("failed to delete user");
        }
    };

    const tdStyle = { padding: '12px', border: '1px solid #ddd' };

    return (
        <div style={{ maxWidth: '800px', margin: '50px auto', fontFamily: 'sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Super Admin Panel</h2>
                <button onClick={() => navigate('/dashboard')} style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#321212ff' }}>Back to Dashboard</button>
            </div>
            {message && <p style={{ padding: '10px', backgroundColor: '#e2e3e5', borderRadius: '4px', fontWeight: 'bold' }}>{message}</p>}

            <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', marginTop: '20px', backgroundColor: '#f9f9f9' }}>
                <h3>Add New User</h3>
                <form onSubmit={handleCreateUser} style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                    <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={{ padding: '8px', flex: 1 }} />
                    <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: '8px', flex: 1 }} />
                    <select value={roleId} onChange={e => setRoleId(parseInt(e.target.value))} required style={{ padding: '8px' }}>
                        <option value={3}>Standard User</option>
                        <option value={2}>Admin</option>
                    </select>
                    <button type="submit" style={{ padding: '8px 16px', cursor: 'pointer', backgroundColor: 'green', color: 'white', border: 'none', borderRadius: '4px' }}>Add User</button>
                </form>
            </div>

            <div style={{ marginTop: '40px' }}>
                <h3>Registered Users</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                    <thead style={{ backgroundColor: '#343a40', color: 'white', textAlign: 'left' }}>
                        <tr>
                            <th style={{ padding: '12px', border: '1px solid #ddd' }}>ID</th>
                            <th style={{ padding: '12px', border: '1px solid #ddd' }}>Email</th>
                            <th style={{ padding: '12px', border: '1px solid #ddd' }}>Role</th>
                            <th style={{ padding: '12px', border: '1px solid #ddd' }}>Created At</th>
                            <th style={{ padding: '12px', border: '1px solid #ddd' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} style={{ backgroundColor: 'white' }}>
                                <td style={tdStyle}>{user.id}</td>
                                <td style={tdStyle}>{user.email}</td>
                                <td style={tdStyle}>{user.role}</td>
                                <td style={tdStyle}>{new Date(user.created_at).toLocaleString()}</td>
                                <td style={tdStyle}>
                                    <button onClick={() => handleDeleteUser(user.id)} style={{ padding: '6px 12px', cursor: 'pointer', backgroundColor: 'red', color: 'white', border: 'none', borderRadius: '4px' }}>Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}