import React from 'react';

const Layout: React.FC = ({ children }) => {
    return (
        <div>
            <header>
                <h1>Conversational AI</h1>
            </header>
            <main>{children}</main>
            <footer>
                <p>&copy; 2023 Conversational AI Project</p>
            </footer>
        </div>
    );
};

export default Layout;