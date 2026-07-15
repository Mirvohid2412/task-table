import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { publicAPI } from '../services/api';
import './PublicTableView.css'; // Mapped to AdminTableDetail.css visually

const PublicTableView = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const tableId = searchParams.get('id');

    const [table, setTable] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [expandedRows, setExpandedRows] = useState({});
    const activeRoleFilter = searchParams.get('role') || 'all';

    const setActiveRoleFilter = (role) => {
        const params = new URLSearchParams(searchParams);
        if (role === 'all') {
            params.delete('role');
        } else {
            params.set('role', role);
        }
        setSearchParams(params, { replace: true });
    };

    // Task view modal
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTask, setModalTask] = useState(null);

    const loadTable = useCallback(async () => {
        if (!tableId) {
            setError(true);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(false);
        try {
            const res = await publicAPI.getById(tableId);
            setTable(res.data);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [tableId]);

    useEffect(() => {
        loadTable();
    }, [loadTable]);

    const toggleRow = (rowId) => {
        setExpandedRows(prev => ({ ...prev, [rowId]: !prev[rowId] }));
    };

    const openTaskModal = (task) => {
        setModalTask(task);
        setModalOpen(true);
    };

    const maskName = (name) => {
        if (!name) return 'Ism / Nomi (kiritilmagan)';
        const words = name.trim().split(/\s+/);
        return words.map(word => {
            if (word.length <= 2) {
                return '*'.repeat(word.length);
            }
            const prefix = word.slice(0, 2);
            const suffix = word.slice(-2);
            const middle = '*'.repeat(Math.max(1, word.length - 4));
            return `${prefix}${middle}${suffix}`;
        }).join(' ');
    };

    const filteredRows = table?.rows?.filter(row => {
        if (activeRoleFilter === 'all') return true;
        return row.role === activeRoleFilter;
    }) || [];

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

    if (error || !table) {
        return (
            <div className="page-container">
                <div className="empty-state">
                    <h3>Jadval topilmadi</h3>
                    <p>Bu havola yaroqsiz yoki jadval o'chirilgan bo'lishi mumkin.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container detail-page" style={{ paddingTop: '20px' }}>

            <div className="detail-header" style={{ justifyContent: 'space-between' }}>
                <h1 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '24px' }}>{table.name}</h1>
                <button className="btn btn-sm btn-secondary" onClick={loadTable}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="23 4 23 10 17 10" />
                        <polyline points="1 20 1 14 7 14" />
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                    </svg>
                    Yangilash
                </button>
            </div>

            {table.roles && table.roles.length > 0 && (
                <div className="roles-bar">
                    <div className="roles-list">
                        <span
                            className={`badge badge-role ${activeRoleFilter === 'all' ? 'active' : ''}`}
                            onClick={() => setActiveRoleFilter('all')}
                        >
                            Hammasi
                        </span>
                        {table.roles.map((role, index) => (
                            <div key={index} className="role-item">
                                <span
                                    className={`badge badge-role ${activeRoleFilter === role ? 'active' : ''}`}
                                    onClick={() => setActiveRoleFilter(role)}
                                >
                                    {role}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="rows-container">
                {filteredRows.map((row, index) => (
                    <div key={row._id} className="row-card" style={{ animationDelay: `${index * 0.03}s` }}>

                        <div className="row-header" onClick={() => toggleRow(row._id)} style={{ flexWrap: 'wrap', gap: '10px', cursor: 'pointer' }}>
                            <div className="row-inputs-section" style={{ flex: 1, display: 'flex', gap: '10px', minWidth: '300px', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '8px', flex: 1, alignItems: 'center' }}>
                                    <span style={{ fontWeight: 600, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {row.hideName ? maskName(row.name) : (row.name || 'Ism / Nomi (kiritilmagan)')}
                                    </span>
                                </div>
                                {row.role && (
                                    <div className="row-role-pill">
                                        Rol: <b>{row.role}</b>
                                    </div>
                                )}
                                <div className="row-chevron" style={{ display: 'flex', alignItems: 'center', padding: '0 8px', marginLeft: 'auto' }}>
                                    <svg
                                        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                        style={{ transform: expandedRows[row._id] === true ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.25s ease' }}
                                    >
                                        <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Expanded Tasks */}
                        {expandedRows[row._id] === true && (
                            <div className="row-tasks">
                                {row.tasks?.length === 0 ? (
                                    <div className="no-tasks">Vazifalar yo'q</div>
                                ) : (
                                    <div className="tasks-table">
                                        <div className="tasks-header" style={{ display: 'flex', gap: '8px', padding: '8px 12px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, alignItems: 'center' }}>
                                            <div style={{ width: '36px', flexShrink: 0 }}>#</div>
                                            <div style={{ flex: 2, minWidth: '120px' }}>Vazifa</div>
                                            <div style={{ flex: 1, minWidth: '100px' }}>Boshlanish</div>
                                            <div style={{ flex: 1, minWidth: '100px' }}>Tugash</div>
                                            <div style={{ flex: 1, minWidth: '100px' }}>Istisno kechiktirish</div>
                                        </div>
                                        {row.tasks.map((task, tIndex) => (
                                            <div key={task._id} className="task-row" onClick={() => openTaskModal(task)} style={{ cursor: 'pointer', display: 'flex', gap: '8px', padding: '8px 12px', alignItems: 'center' }}>
                                                <div style={{ width: '36px', flexShrink: 0, fontWeight: 600, color: 'var(--accent-primary)' }}>{tIndex + 1}</div>

                                                <div style={{ flex: 2, minWidth: '120px' }}>
                                                    <button
                                                        className="btn btn-sm btn-primary"
                                                        style={{ width: '100%', wordBreak: 'break-all', textAlign: 'left', pointerEvents: 'none', border: '1px solid rgba(108, 92, 231, 0.35)', fontWeight: 700 }}
                                                    >
                                                        Vazifani ko'rish uchun bosing
                                                    </button>
                                                </div>

                                                <div style={{ flex: 1, minWidth: '100px' }}>
                                                    <label className="mobile-label">Boshlanish</label>
                                                    <div className="input" style={{ display: 'flex', alignItems: 'center' }}>
                                                        {task.startDate || '-'}
                                                    </div>
                                                </div>

                                                <div style={{ flex: 1, minWidth: '100px' }}>
                                                    <label className="mobile-label">Tugash</label>
                                                    <div className="input" style={{ display: 'flex', alignItems: 'center' }}>
                                                        {task.endDate || '-'}
                                                    </div>
                                                </div>

                                                <div style={{ flex: 1, minWidth: '100px' }}>
                                                    <label className="mobile-label">Istisno kechiktirish</label>
                                                    <div className="input" style={{ display: 'flex', alignItems: 'center', color: task.delay ? 'var(--accent-warning)' : 'var(--text-muted)' }}>
                                                        {task.delay || 'Kechiktirish yo\'q'}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {filteredRows.length === 0 && (
                <div className="empty-state" style={{ padding: '60px 20px' }}>
                    <h3>Ma'lumot topilmadi</h3>
                    <p>Hozircha hech qanday ma'lumot yo'q</p>
                </div>
            )}

            {/* Task View Modal (Read Only) */}
            {modalOpen && modalTask && (
                <div className="modal-overlay" onClick={() => setModalOpen(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Vazifa ma'lumotlari</h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setModalOpen(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="modal-field">
                                <label>Vazifa nomi</label>
                                <div className="modal-readonly-value" style={{ padding: '10px 14px', background: 'var(--bg-input)', borderRadius: '6px', color: 'var(--text-primary)' }}>
                                    {modalTask.name || "Ko'rsatilmagan"}
                                </div>
                            </div>
                            <div className="modal-field" style={{ marginTop: '16px' }}>
                                <label>Tafsilotlar</label>
                                <div className="modal-readonly-value description" style={{ padding: '10px 14px', background: 'var(--bg-input)', borderRadius: '6px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', minHeight: '80px' }}>
                                    {modalTask.description || "Tafsilot yo'q"}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer" style={{ marginTop: '20px' }}>
                            <button className="btn btn-primary" onClick={() => setModalOpen(false)}>Yopish</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PublicTableView;
