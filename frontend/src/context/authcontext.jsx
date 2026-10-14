import { createContext, useState, useEffect } from "react";

export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(null);
    const [roleId, setRoleId] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const parseAndSetToken = (t) => {
        try {
            const payload = JSON.parse(atob(t.split('.')[1]));
            if (payload.exp && Date.now() >= payload.exp * 1000) {
                setToken(null);
                setRoleId(null);
                setUser(null);
                localStorage.removeItem('token');
                return false;
            }
            setToken(t);
            setRoleId(payload.role_id);
            setUser({
                userId: payload.user_id,
                roleId: payload.role_id,
                email: payload.email,
                name: payload.name || payload.email?.split('@')[0]
            });
            return true;
        } catch (err) {
            setToken(null);
            setRoleId(null);
            setUser(null);
            localStorage.removeItem('token');
            return false;
        }
    };

    useEffect(() => {
        const savedToken = localStorage.getItem('token');
        if (savedToken) {
            parseAndSetToken(savedToken);
        }
        setLoading(false);
    }, []);

    const login = (newToken) => {
        parseAndSetToken(newToken);
        localStorage.setItem('token', newToken);
    };

    const logout = () => {
        setToken(null);
        setRoleId(null);
        setUser(null);
        localStorage.removeItem('token');
    };

    return (
        <AuthContext.Provider value={{ token, roleId, user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

