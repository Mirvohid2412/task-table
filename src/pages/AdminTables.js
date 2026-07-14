import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { tablesAPI, authAPI } from '../services/api';
import './AdminTables.css';

const AdminTables = () => {
    const navigate = useNavigate();
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toasts, setToasts] = useState([]);
    const [confirmAction, setConfirmAction] = useState(null);
    const [editingTableId, setEditingTableId] = useState(null);
    const [editingTableName, setEditingTableName] = useState('');

    const addToast = useCallback((message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    useEffect(() => {
        const checkAndLoad = async () => {
            try {
                await authAPI.check();
                const res = await tablesAPI.getAll();
                setTables(res.data);
            } catch {
                localStorage.removeItem('admin_token');
                navigate('/admin/auth', { replace: true });
            } finally {
                setLoading(false);
            }
        };
        checkAndLoad();
    }, [navigate]);

    const handleCreate = async () => {
        try {
            const res = await tablesAPI.create({ name: 'Yangi jadval' });
            setTables(prev => [res.data, ...prev]);
            addToast('Yangi jadval yaratildi', 'success');
        } catch (err) {
            addToast('Jadval yaratishda xatolik', 'error');
        }
    };

    const handleDelete = (tableId) => {
        setConfirmAction({
            message: "Bu jadval o'chirib yuborilsinmi?",
            onConfirm: async () => {
                try {
                    await tablesAPI.delete(tableId);
                    setTables(prev => prev.filter(t => t.tableId !== tableId));
                    addToast("Jadval o'chirildi", 'success');
                } catch {
                    addToast("O'chirishda xatolik", 'error');
                } finally {
                    setConfirmAction(null);
                }
            }
        });
    };

    const handleRegenerate = async (tableId) => {
        try {
            const res = await tablesAPI.regenerateId(tableId);
            setTables(prev => prev.map(t => t.tableId === tableId ? res.data : t));
            addToast('ID yangilandi', 'success');
        } catch {
            addToast('ID yangilashda xatolik', 'error');
        }
    };

    const handleSaveName = async (tableId) => {
        if (!editingTableName.trim()) {
            addToast('Jadval nomi bo\'sh bo\'lishi mumkin emas', 'error');
            return;
        }
        try {
            const res = await tablesAPI.updateName(tableId, editingTableName);
            setTables(prev => prev.map(t => t.tableId === tableId ? { ...t, name: res.data.name } : t));
            setEditingTableId(null);
            addToast('Jadval nomi yangilandi', 'success');
        } catch {
            addToast('Jadval nomini yangilashda xatolik', 'error');
        }
    };

    const handleCopyUrl = (tableId) => {
        const url = `${window.location.origin}/tasks?id=${tableId}`;
        navigator.clipboard.writeText(url);
        addToast('URL nusxalandi', 'info');
    };

    const handleOpen = (tableId) => {
        navigate(`/admin/tasks?id=${tableId}`);
    };

    const handleLogout = () => {
        localStorage.removeItem('admin_token');
        navigate('/admin/auth', { replace: true });
    };

    if (loading) {
        return (
            <div className="page-container">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Yuklanmoqda...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            {/* Toasts */}
            <div className="toast-container">
                {toasts.map(toast => (
                    <div key={toast.id} className={`toast toast-${toast.type}`}>
                        {toast.message}
                    </div>
                ))}
            </div>

            {/* Header */}
            <div className="page-header">
                <h1>📋 Jadvallar</h1>
                <div className="header-actions">
                    <button className="btn btn-ghost" onClick={handleLogout}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Chiqish
                    </button>
                </div>
            </div>

            {/* Table List */}
            <div className="tables-grid">
                {tables.map((table, index) => (
                    <div className="table-card card" key={table.tableId} style={{ animationDelay: `${index * 0.05}s` }}>
                        <div className="table-card-header">
                            <div className="table-info" style={{ width: '100%' }}>
                                {editingTableId === table.tableId ? (
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1, marginRight: '10px' }}>
                                        <input
                                            type="text"
                                            className="input"
                                            value={editingTableName}
                                            onChange={(e) => setEditingTableName(e.target.value)}
                                            style={{ margin: 0, padding: '6px 12px', fontSize: '15px' }}
                                            autoFocus
                                        />
                                        <button className="btn btn-sm btn-success" onClick={() => handleSaveName(table.tableId)}>
                                            Saqlash
                                        </button>
                                        <button className="btn btn-sm btn-secondary" onClick={() => setEditingTableId(null)}>
                                            Bekor qilish
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <h3 className="table-name" style={{ margin: 0 }}>{table.name}</h3>
                                        <button
                                            className="btn btn-sm btn-secondary"
                                            onClick={() => {
                                                setEditingTableId(table.tableId);
                                                setEditingTableName(table.name);
                                            }}
                                            title="Nomini o'zgartirish"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                            </svg>
                                            Nomini tahrirlash
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="table-card-actions" style={{ flexWrap: 'wrap', alignItems: 'center', marginTop: '16px' }}>
                            <div style={{ flex: 1, minWidth: '150px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                ID: <span style={{ color: 'var(--text-primary)', userSelect: 'all', marginRight: '6px' }}>{table.tableId}</span>
                            </div>

                            <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => handleRegenerate(table.tableId)}
                                title="ID yangilash"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="23 4 23 10 17 10" />
                                    <polyline points="1 20 1 14 7 14" />
                                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                                </svg>
                                Yangi ID
                            </button>

                            <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => handleCopyUrl(table.tableId)}
                                title="URL nusxalash"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                                URL nusxalash
                            </button>

                            <button
                                className="btn btn-sm btn-primary"
                                onClick={() => handleOpen(table.tableId)}
                                title="Ochish"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                    <polyline points="15 3 21 3 21 9" />
                                    <line x1="10" y1="14" x2="21" y2="3" />
                                </svg>
                                Ochish
                            </button>

                            <button
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDelete(table.tableId)}
                                title="O'chirish"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                                O'chirish
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Button */}
            <div className="tables-footer">
                <button className="btn btn-primary create-table-btn" onClick={handleCreate}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Yangi jadval yaratish
                </button>
            </div>

            {tables.length === 0 && (
                <div className="empty-state">
                    <div className="empty-icon">📋</div>
                    <h3>Jadvallar yo'q</h3>
                    <p>Yangi jadval yaratish uchun "Yangi jadval yaratish" tugmasini bosing</p>
                </div>
            )}

            {/* Confirm Actions Modal */}
            {confirmAction && (
                <div className="modal-overlay" onClick={() => setConfirmAction(null)}>
                    <div className="modal-content" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Tasdiqlash</h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setConfirmAction(null)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ padding: '24px 20px', textAlign: 'center', fontSize: '15px' }}>
                            {confirmAction.message}
                        </div>
                        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                            <button className="btn btn-secondary" onClick={() => setConfirmAction(null)}>Yo'q</button>
                            <button className="btn btn-danger" onClick={confirmAction.onConfirm}>Ha, tasdiqlayman</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminTables;
