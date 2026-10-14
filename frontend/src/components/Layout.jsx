import { useState } from 'react';
import Sidebar from './Sidebar';

export default function Layout({ children }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="app-shell">
            <Sidebar 
                isOpen={mobileMenuOpen} 
                onClose={() => setMobileMenuOpen(false)} 
            />

            <div className="app-main">
                {/* Mobile Top Header */}
                <header className="mobile-header">
                    <button 
                        className="mobile-menu-btn" 
                        onClick={() => setMobileMenuOpen(true)}
                        aria-label="Open navigation menu"
                    >
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                    </button>
                    <div className="mobile-brand-title">
                        Tag Fetcher
                    </div>
                </header>

                {/* Content Area */}
                <main className="app-content">
                    {children}
                </main>
            </div>
        </div>
    );
}
