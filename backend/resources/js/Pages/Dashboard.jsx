import React from 'react';

export default function Dashboard({ auth }) {
    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Dashboard</h1>
            <p>Welcome back, {auth.user.name}!</p>
            <div style={{ marginTop: '20px' }}>
                <a href="/logout" style={{ color: 'red' }}>Logout</a>
            </div>
        </div>
    );
}
