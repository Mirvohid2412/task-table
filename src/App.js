import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminLogin from './pages/AdminLogin';
import AdminTables from './pages/AdminTables';
import AdminTableDetail from './pages/AdminTableDetail';
import PublicTableView from './pages/PublicTableView';

function App() {
    return (
        <Router>
            <Routes>
                {/* Admin Routes */}
                <Route path="/admin/auth" element={<AdminLogin />} />
                <Route path="/admin/tables" element={<AdminTables />} />
                <Route path="/admin/tasks" element={<AdminTableDetail />} />

                {/* Public Routes */}
                <Route path="/tasks" element={<PublicTableView />} />

                {/* Redirect root to public */}
                <Route path="/" element={<Navigate to="/admin/auth" replace />} />
                <Route path="*" element={<Navigate to="/admin/auth" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
