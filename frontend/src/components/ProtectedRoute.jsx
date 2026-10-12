import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/authcontext';

export default function ProtectedRoute({ children, allowedRoles }) {
    const { token, roleId, loading } = useContext(AuthContext);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', color: 'var(--text-muted)' }}>
                Loading...
            </div>
        );
    }

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(roleId)) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}
