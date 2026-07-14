import React, { useState, useEffect } from 'react';
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

    useEffect(() => {
        const loadTable = async () => {
            if (!tableId) {
                setError(true);
                setLoading(false);
                return;
            }
            try {
                const res = await publicAPI.getById(tableId);
                setTable(res.data);
                if (res.data.roles?.length > 0 && !searchParams.has('role')) {
                    // Do nothing, let it default to 'all' in the constant
                }
            } catch {
                setError(true);
            } finally {
                setLoading(false);
            }
        };
        loadTable();
    }, [tableId]);

    const toggleRow = (rowId) => {
        setExpandedRows(prev => ({ ...prev, [rowId]: !prev[rowId] }));
    };

    const openTaskModal = (task) => {
        setModalTask(task);
        setModalOpen(true);
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

            <div className="detail-header" style={{ justifyContent: 'center' }}>
                <div className="detail-header-right">
                    <h1 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '24px' }}>{table.name}</h1>
                </div>
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

                        <div className="row-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
                            <div className="row-inputs-section" style={{ flex: 1, display: 'flex', gap: '10px', minWidth: '300px', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '8px', flex: 1, alignItems: 'center' }}>
                                    <span
                                        onClick={() => toggleRow(row._id)}
                                        style={{ cursor: 'pointer', fontWeight: 600, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}
                                    >
                                        <div className="row-num">{index + 1}</div>
                                        {row.name || 'Ism / Nomi (kiritilmagan)'}
                                    </span>
                                </div>
                                {row.role && (
                                    <div style={{ padding: '6px 12px', background: 'var(--bg-input)', borderRadius: '6px', fontSize: '13px', color: 'var(--text-primary)' }}>
                                        Rol: <b>{row.role}</b>
                                    </div>
                                )}
                            </div>

                            <div className="row-actions" style={{ justifyContent: 'flex-end', marginLeft: 'auto' }}>
                                <div className="row-chevron" onClick={() => toggleRow(row._id)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0 8px' }}>
                                    <svg
                                        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                        style={{ transform: expandedRows[row._id] === false ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.25s ease' }}
                                    >
                                        <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Expanded Tasks */}
                        {expandedRows[row._id] !== false && (
                            <div className="row-tasks">
                                {row.tasks?.length === 0 ? (
                                    <div className="no-tasks">Vazifalar yo'q</div>
                                ) : (
                                    <div className="tasks-table">
                                        <div className="tasks-header" style={{ display: 'flex', gap: '8px', padding: '0 12px 8px', borderBottom: '1px solid var(--border-color)', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>
                                            <div className="task-col-num" style={{ width: '36px' }}>#</div>
                                            <div className="task-col" style={{ flex: 2, minWidth: '200px' }}>Vazifa</div>
                                            <div className="task-col" style={{ flex: 1, minWidth: '120px' }}>Boshlanish</div>
                                            <div className="task-col" style={{ flex: 1, minWidth: '120px' }}>Tugash</div>
                                            <div className="task-col" style={{ flex: 1, minWidth: '120px' }}>Istisno kechiktirish</div>
                                        </div>
                                        {row.tasks.map((task, tIndex) => (
                                            <div key={task._id} className="task-row">
                                                <div className="task-col task-col-num">{tIndex + 1}</div>

                                                <div className="task-col" style={{ flex: 2, minWidth: '200px' }}>
                                                    <button
                                                        className="btn btn-sm btn-secondary"
                                                        style={{ width: '100%', wordBreak: 'break-all', textAlign: 'left' }}
                                                        onClick={() => openTaskModal(task)}
                                                    >
                                                        {task.name || "Vazifani tahrirlash uchun bosing"}
                                                    </button>
                                                </div>

                                                <div className="task-col" style={{ flex: 1, minWidth: '120px' }}>
                                                    <div className="input" style={{ display: 'flex', alignItems: 'center', color: task.startDate ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                                        {task.startDate || 'Boshlash vaqti yo\'q'}
                                                    </div>
                                                </div>

                                                <div className="task-col" style={{ flex: 1, minWidth: '120px' }}>
                                                    <div className="input" style={{ display: 'flex', alignItems: 'center', color: task.endDate ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                                        {task.endDate || 'Tugash vaqti yo\'q'}
                                                    </div>
                                                </div>

                                                <div className="task-col" style={{ flex: 1, minWidth: '120px' }}>
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
