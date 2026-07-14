import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { tablesAPI, rolesAPI, authAPI } from '../services/api';
import './AdminTableDetail.css';

const AdminTableDetail = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const tableId = searchParams.get('id');

    const [table, setTable] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedRows, setExpandedRows] = useState({});
    const [editingRowIds, setEditingRowIds] = useState({});
    const [toasts, setToasts] = useState([]);
    const [isDirty, setIsDirty] = useState(false);

    // Confirm Modal state
    const [confirmAction, setConfirmAction] = useState(null);

    // Modal state for Task Name / Description
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTask, setModalTask] = useState(null);
    const [modalRowId, setModalRowId] = useState(null);

    // New role input
    const [newRoleName, setNewRoleName] = useState('');
    const [showRoleInput, setShowRoleInput] = useState(false);

    // Active role filter (Sync with URL)
    const activeRoleFilter = searchParams.get('role') || 'all';

    const setActiveRoleFilter = useCallback((role) => {
        const params = new URLSearchParams(searchParams);
        if (role === 'all') {
            params.delete('role');
        } else {
            params.set('role', role);
        }
        setSearchParams(params, { replace: true });
    }, [searchParams, setSearchParams]);

    const addToast = useCallback((message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    }, []);

    const fetchTable = useCallback(async () => {
        try {
            const res = await tablesAPI.getById(tableId);
            setTable(res.data);
            setIsDirty(false);
        } catch {
            addToast('Jadval yuklanmadi', 'error');
        } finally {
            setLoading(false);
        }
    }, [tableId, addToast]);

    useEffect(() => {
        const checkAndLoad = async () => {
            try {
                await authAPI.check();
                if (!tableId) {
                    navigate('/admin/tables', { replace: true });
                    return;
                }
                fetchTable();
            } catch {
                localStorage.removeItem('admin_token');
                navigate('/admin/auth', { replace: true });
            }
        };
        checkAndLoad();
    }, [navigate, tableId, fetchTable]);

    // Regenerate table ID
    const handleRegenerateId = async () => {
        try {
            const res = await tablesAPI.regenerateId(tableId);
            navigate(`/admin/tasks?id=${res.data.tableId}`, { replace: true });
            setTable(res.data);
            addToast('ID yangilandi', 'success');
        } catch {
            addToast('Xatolik', 'error');
        }
    };

    // Roles
    const handleAddRole = async () => {
        if (!newRoleName.trim()) return;
        try {
            const res = await rolesAPI.add(tableId, newRoleName.trim());
            setTable(res.data);
            setNewRoleName('');
            setShowRoleInput(false);
            addToast('Rol qo\'shildi', 'success');
        } catch {
            addToast('Xatolik', 'error');
        }
    };

    const handleDeleteRole = async (index) => {
        try {
            const res = await rolesAPI.delete(tableId, index);
            setTable(res.data);
            setActiveRoleFilter('all');
            addToast('Rol o\'chirildi', 'success');
        } catch {
            addToast('Xatolik', 'error');
        }
    };

    // ===============================================
    // LOCAL STATE CHANGES (will trigger isDirty = true)
    // ===============================================

    // Add Row locally
    const handleCreateRowLocal = () => {
        const defaultRole = activeRoleFilter !== 'all' ? activeRoleFilter : '';

        setTable(prev => ({
            ...prev,
            rows: [...prev.rows, {
                _id: 'temp_' + Date.now().toString() + Math.random(),
                name: '',
                role: defaultRole,
                tasks: [{
                    _id: 'temp_task_' + Date.now().toString() + Math.random(),
                    name: "",
                    description: '',
                    startDate: '',
                    endDate: '',
                    delay: '',
                }]
            }]
        }));
        setIsDirty(true);
    };

    // Remove Row locally
    const handleDeleteRowLocal = (rowId) => {
        setConfirmAction({
            message: "Rostdan ham bu qatorni o'chirasizmi?",
            onConfirm: () => {
                setTable(prev => ({
                    ...prev,
                    rows: prev.rows.filter(r => r._id !== rowId)
                }));
                setIsDirty(true);
                setConfirmAction(null);
            }
        });
    };

    // Edit Row Name/Role locally
    const handleRowUpdateLocal = (rowId, field, value) => {
        setTable(prev => ({
            ...prev,
            rows: prev.rows.map(r => r._id === rowId ? { ...r, [field]: value } : r)
        }));
        setIsDirty(true);
    };

    // Add Task locally
    const handleAddTaskLocal = (rowId) => {
        setTable(prev => ({
            ...prev,
            rows: prev.rows.map(row => {
                if (row._id === rowId) {
                    return {
                        ...row,
                        tasks: [...row.tasks, {
                            _id: 'temp_task_' + Date.now().toString() + Math.random(),
                            name: "",
                            description: '',
                            startDate: '',
                            endDate: '',
                            delay: '',
                        }]
                    };
                }
                return row;
            })
        }));
        setIsDirty(true);
    };

    // Remove Task locally
    const handleDeleteTaskLocal = (rowId, taskId) => {
        setConfirmAction({
            message: "Vazifani o'chirasizmi?",
            onConfirm: () => {
                setTable(prev => ({
                    ...prev,
                    rows: prev.rows.map(row => {
                        if (row._id === rowId) {
                            return {
                                ...row,
                                tasks: row.tasks.filter(t => t._id !== taskId)
                            };
                        }
                        return row;
                    })
                }));
                setIsDirty(true);
                setConfirmAction(null);
            }
        });
    };

    // Edit Task field locally
    const handleTaskUpdateLocal = (rowId, taskId, field, value) => {
        setTable(prev => ({
            ...prev,
            rows: prev.rows.map(row => {
                if (row._id === rowId) {
                    return {
                        ...row,
                        tasks: row.tasks.map(t => t._id === taskId ? { ...t, [field]: value } : t)
                    };
                }
                return row;
            })
        }));
        setIsDirty(true);
    };

    const toggleRow = (rowId) => {
        setExpandedRows(prev => ({ ...prev, [rowId]: !prev[rowId] }));
    };

    // MODAL STATE MANAGMENT
    const openTaskModal = (task, rowId) => {
        setModalTask({ ...task });
        setModalRowId(rowId);
        setModalOpen(true);
    };

    const handleModalClose = () => {
        // Save modal state to local state
        handleTaskUpdateLocal(modalRowId, modalTask._id, 'name', modalTask.name);
        handleTaskUpdateLocal(modalRowId, modalTask._id, 'description', modalTask.description);
        setModalOpen(false);
    };

    // GLOBAL SAVE / CANCEL
    const handleGlobalSave = async () => {
        try {
            // Because we create IDs with `temp_`, MongoDB will fail if we pass them.
            // Let's clean up temp IDs so Mongoose will auto-generate real ObjectIds for new subdocs.
            const rowsToSave = table.rows.map(row => {
                const newRow = { ...row };
                if (newRow._id && newRow._id.startsWith('temp_')) delete newRow._id;
                newRow.tasks = newRow.tasks.map(task => {
                    const newTask = { ...task };
                    if (newTask._id && newTask._id.startsWith('temp_')) delete newTask._id;
                    return newTask;
                });
                return newRow;
            });

            const res = await tablesAPI.updateData(tableId, rowsToSave);
            setTable(res.data);
            setIsDirty(false);
            addToast("Barcha o'zgarishlar saqlandi", 'success');
        } catch {
            addToast('Saqlashda xatolik', 'error');
        }
    };

    const handleGlobalCancel = () => {
        setConfirmAction({
            message: "Kiritilgan o'zgarishlar bekor qilinadi, rozimisiz?",
            onConfirm: () => {
                fetchTable(); // refetches and resets table state
                setIsDirty(false);
                addToast("O'zgarishlar bekor qilindi", 'info');
                setConfirmAction(null);
            }
        });
    };

    // Filtered rows
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

    if (!table) {
        return (
            <div className="page-container">
                <div className="empty-state">
                    <h3>Jadval topilmadi</h3>
                    <button className="btn btn-primary" onClick={() => navigate('/admin/tables')}>
                        Orqaga
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container detail-page">
            <div className="toast-container">
                {toasts.map(toast => (
                    <div key={toast.id} className={`toast toast-${toast.type}`}>{toast.message}</div>
                ))}
            </div>

            <div className="detail-header">
                <button className="btn btn-ghost" onClick={() => navigate('/admin/tables')}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                    </svg>
                    Orqaga
                </button>
                <div className="detail-header-right">
                    <button className="btn btn-sm btn-secondary" onClick={handleRegenerateId}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="23 4 23 10 17 10" />
                            <polyline points="1 20 1 14 7 14" />
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                        </svg>
                        Yangi ID yaratish
                    </button>
                </div>
            </div>

            <div className="roles-bar">
                <div className="roles-list">
                    <span
                        className={`badge badge-role ${activeRoleFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setActiveRoleFilter('all')}
                    >
                        Hammasi
                    </span>
                    {table.roles?.map((role, index) => (
                        <div key={index} className="role-item">
                            <span
                                className={`badge badge-role ${activeRoleFilter === role ? 'active' : ''}`}
                                onClick={() => setActiveRoleFilter(role)}
                            >
                                {role}
                            </span>
                            <button
                                className="role-delete-btn"
                                onClick={() => handleDeleteRole(index)}
                                title="O'chirish"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
                <div className="roles-add">
                    {showRoleInput ? (
                        <div className="role-input-group">
                            <input
                                type="text"
                                className="input"
                                placeholder="Rol nomi..."
                                value={newRoleName}
                                onChange={(e) => setNewRoleName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddRole()}
                                autoFocus
                            />
                            <button className="btn btn-sm btn-success" onClick={handleAddRole}>✓</button>
                            <button className="btn btn-sm btn-ghost" onClick={() => { setShowRoleInput(false); setNewRoleName(''); }}>✕</button>
                        </div>
                    ) : (
                        <button className="btn btn-sm btn-secondary" onClick={() => setShowRoleInput(true)}>
                            + Yangi Rol
                        </button>
                    )}
                </div>
            </div>

            <div className="rows-container">
                {filteredRows.map((row, index) => (
                    <div key={row._id} className="row-card" style={{ animationDelay: `${index * 0.03}s` }}>
                        {/* Editable row header */}
                        <div className="row-header" onClick={(e) => { if (e.target.closest('.row-actions') || e.target.closest('.row-inputs-section input') || e.target.closest('.row-inputs-section select')) return; toggleRow(row._id); }} style={{ flexWrap: 'wrap', gap: '10px', cursor: 'pointer' }}>

                            <div className="row-inputs-section" style={{ flex: 1, display: 'flex', gap: '10px', minWidth: '300px', alignItems: 'center' }}>
                                {editingRowIds[row._id] ? (
                                    <div style={{ display: 'flex', gap: '6px', flex: 1 }} onClick={(e) => e.stopPropagation()}>
                                        <input
                                            className="input"
                                            value={row.name}
                                            style={{ flex: 1 }}
                                            onChange={(e) => handleRowUpdateLocal(row._id, 'name', e.target.value)}
                                            placeholder="Ism / Nomi"
                                            autoFocus
                                            onKeyDown={(e) => e.key === 'Enter' && setEditingRowIds(prev => ({ ...prev, [row._id]: false }))}
                                        />
                                        <button
                                            className="btn btn-sm btn-success"
                                            onClick={() => setEditingRowIds(prev => ({ ...prev, [row._id]: false }))}
                                            title="Tahrirni saqlash"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', gap: '8px', flex: 1, alignItems: 'center' }}>
                                        <span style={{ fontWeight: 600, fontSize: '15px' }}>
                                            {row.name || 'Ism / Nomi (kiritilmagan)'}
                                        </span>
                                    </div>
                                )}

                                {table.roles && table.roles.length > 0 && (
                                    <select
                                        className="input"
                                        style={{ width: 'auto', minWidth: '150px' }}
                                        value={row.role || ''}
                                        onChange={(e) => handleRowUpdateLocal(row._id, 'role', e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <option value="">Rol tanlang...</option>
                                        {table.roles.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                )}
                            </div>

                            <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                                {!editingRowIds[row._id] && (
                                    <button className="btn btn-sm btn-secondary" onClick={() => setEditingRowIds(prev => ({ ...prev, [row._id]: true }))} title="Ismni tahrirlash">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                                        Tahrirlash
                                    </button>
                                )}
                                <button className="btn btn-sm btn-primary" onClick={() => handleAddTaskLocal(row._id)}>
                                    Vazifa qo'shish
                                </button>
                                <button className="btn btn-sm btn-danger" onClick={() => handleDeleteRowLocal(row._id)} title="O'chirish">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    </svg>
                                </button>
                                <div className="row-chevron" style={{ display: 'flex', alignItems: 'center', padding: '0 8px' }}>
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
                                            <div className="task-col task-col-actions" style={{ width: '150px' }}></div>
                                        </div>
                                        {row.tasks.map((task, tIndex) => (
                                            <div key={task._id} className="task-row">
                                                <div className="task-col task-col-num">{tIndex + 1}</div>

                                                <div className="task-col" style={{ flex: 2, minWidth: '200px' }}>
                                                    <button
                                                        className="btn btn-sm btn-secondary"
                                                        style={{ width: '100%', wordBreak: 'break-all' }}
                                                        onClick={() => openTaskModal(task, row._id)}
                                                    >
                                                        {task.name || "Vazifani tahrirlash uchun bosing"}
                                                    </button>
                                                </div>

                                                <div className="task-col" style={{ flex: 1, minWidth: '120px' }}>
                                                    <input
                                                        type="text"
                                                        className="input"
                                                        placeholder="00.00.0000 00:00"
                                                        value={task.startDate}
                                                        onChange={(e) => handleTaskUpdateLocal(row._id, task._id, 'startDate', e.target.value)}
                                                    />
                                                </div>

                                                <div className="task-col" style={{ flex: 1, minWidth: '120px' }}>
                                                    <input
                                                        type="text"
                                                        className="input"
                                                        placeholder="00.00.0000 00:00"
                                                        value={task.endDate}
                                                        onChange={(e) => handleTaskUpdateLocal(row._id, task._id, 'endDate', e.target.value)}
                                                    />
                                                </div>

                                                <div className="task-col" style={{ flex: 1, minWidth: '120px' }}>
                                                    <input
                                                        type="text"
                                                        className="input"
                                                        placeholder="00.00.0000 00:00"
                                                        value={task.delay}
                                                        onChange={(e) => handleTaskUpdateLocal(row._id, task._id, 'delay', e.target.value)}
                                                    />
                                                </div>

                                                <div className="task-col task-col-actions" style={{ width: 'auto' }}>
                                                    <button
                                                        className="btn btn-sm btn-danger"
                                                        onClick={() => handleDeleteTaskLocal(row._id, task._id)}
                                                    >
                                                        O'chirish
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-secondary"
                                                        onClick={() => openTaskModal(task, row._id)}
                                                    >
                                                        Tahrirlash
                                                    </button>
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
                <div className="empty-state" style={{ borderBottom: '1px solid var(--border-color)', marginBottom: '16px' }}>
                    {activeRoleFilter !== 'all' ? (
                        <>
                            <h3>Bu rolda qatorlar topilmadi</h3>
                            <p>Boshqa rolni tanlang yoki "Hammasi" ga o'ting</p>
                        </>
                    ) : (
                        <>
                            <h3>Qatorlar yo'q</h3>
                            <p>Yangi qator yaratish uchun "Yangi qator yaratish" tugmasini bosing</p>
                        </>
                    )}
                </div>
            )}

            {/* Global Actions (Create Row, Cancel, Save) */}
            <div className="global-actions" style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '20px' }}>
                <button className="btn btn-secondary create-table-btn" onClick={handleCreateRowLocal}>
                    Yangi qator yaratish
                </button>
                {isDirty && (
                    <div className="global-save-actions" style={{ display: 'flex', gap: '10px' }}>
                        <button className="btn btn-secondary" onClick={handleGlobalCancel}>Bekor qilish</button>
                        <button className="btn btn-primary" onClick={handleGlobalSave}>Saqlash</button>
                    </div>
                )}
            </div>

            {/* Task View/Edit Modal (Only Name & Desc, NO API CALL) */}
            {modalOpen && modalTask && (
                <div className="modal-overlay" onClick={handleModalClose}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Vazifa matnini tahrirlash</h3>
                            <button className="btn btn-ghost btn-icon" onClick={handleModalClose}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="modal-field">
                                <label>Vazifa nomi</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Vazifa nomini kiriting..."
                                    value={modalTask.name}
                                    onChange={(e) => setModalTask({ ...modalTask, name: e.target.value })}
                                />
                            </div>
                            <div className="modal-field">
                                <label>Tafsilot (Text)</label>
                                <textarea
                                    className="input textarea"
                                    placeholder="Vazifa tafsilotini kiriting..."
                                    value={modalTask.description}
                                    onChange={(e) => setModalTask({ ...modalTask, description: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-primary" onClick={handleModalClose}>Yopish</button>
                        </div>
                    </div>
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

export default AdminTableDetail;
