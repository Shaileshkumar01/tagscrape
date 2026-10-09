import { createContext, useState, useEffect } from "react";

export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(null);
    const [roleId, setRoleId] = useState(null);

    const parseAndSetToken = (t) => {
        setToken(t);
        try {
            const payload = JSON.parse(atob(t.split('.')[1]));
            setRoleId(payload.role_id);
        } catch (err) {
            setRoleId(null);
        }
    };

    useEffect(() => {
        const savedToken = localStorage.getItem('token');
        if (savedToken) {
            parseAndSetToken(savedToken);
        }
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
        <AuthContext.Provider value={{ token, roleId, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

