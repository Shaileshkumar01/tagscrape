import { createContext, useState, useEffect } from "react";

export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(null);
    const [roleId, setRoleId] = useState(null);
    const [loading, setLoading] = useState(true);

    const parseAndSetToken = (t) => {
        try {
            const payload = JSON.parse(atob(t.split('.')[1]));
            if (payload.exp && Date.now() >= payload.exp * 1000) {
                setToken(null);
                setRoleId(null);
                localStorage.removeItem('token');
                return false;
            }
            setToken(t);
            setRoleId(payload.role_id);
            return true;
        } catch (err) {
            setToken(null);
            setRoleId(null);
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
        localStorage.removeItem('token');
    };

    return (
        <AuthContext.Provider value={{ token, roleId, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

