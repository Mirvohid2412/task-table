import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { tablesAPI, rolesAPI, authAPI, rowsAPI, tasksAPI } from '../services/api';
import './AdminTableDetail.css';

const AdminTableDetail = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const tableId = searchParams.get('id');

    const [table, setTable] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedRows, setExpandedRows] = useState({});
    const [editingRowIds, setEditingRowIds] = useState({});
    const [rowNameDrafts, setRowNameDrafts] = useState({});
    const [editingTaskIds, setEditingTaskIds] = useState({});
    const [editingTelegramLinkRowId, setEditingTelegramLinkRowId] = useState(null);
    const [telegramLinkDrafts, setTelegramLinkDrafts] = useState({});
    const [toasts, setToasts] = useState([]);
    const isSaving = useRef(false);

    // Confirm Modal state
    const [confirmAction, setConfirmAction] = useState(null);

    // Modal state for Task Name / Description
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTask, setModalTask] = useState(null);
    const [modalRowId, setModalRowId] = useState(null);
    const [isEditingModalName, setIsEditingModalName] = useState(false);
    const [isEditingModalDesc, setIsEditingModalDesc] = useState(false);

    const [newRoleName, setNewRoleName] = useState('');
    const [showRoleInput, setShowRoleInput] = useState(false);

    // Loader variables
    const [creatingRow, setCreatingRow] = useState(false);
    const [deletingRowIds, setDeletingRowIds] = useState({});
    const [creatingTasks, setCreatingTasks] = useState({});
    const [deletingTaskIds, setDeletingTaskIds] = useState({});
    const [togglingNameVisibility, setTogglingNameVisibility] = useState({});

    const SpinnerIcon = () => (
        <svg className="loading-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 4 20 4"></polyline>
            <path d="M4 10a8 8 0 0 0 16 0"></path>
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25"></circle>
            <path d="M12 2a10 10 0 0 1 10 10"></path>
        </svg>
    );

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
        setLoading(true);
        try {
            const res = await tablesAPI.getById(tableId);
            setTable(res.data);
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

    const handleCopyTableId = async () => {
        if (!tableId) return;
        try {
            await navigator.clipboard.writeText(tableId);
            addToast('ID nusxalandi', 'success');
        } catch {
            addToast('ID nusxalab bo\'lmadi', 'error');
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

    const handleDeleteRole = (index) => {
        const roleName = table?.roles?.[index] || 'this role';
        setConfirmAction({
            message: `Rostdan ham "${roleName}" rolini o'chirmoqchimisiz?`,
            onConfirm: async () => {
                setConfirmAction(null);
                try {
                    const res = await rolesAPI.delete(tableId, index);
                    setTable(res.data);
                    setActiveRoleFilter('all');
                    addToast('Rol o\'chirildi', 'success');
                } catch {
                    addToast('Xatolik', 'error');
                }
            }
        });
    };

    const handleToggleHideNameForRow = async (rowId) => {
        const row = table?.rows?.find(r => r._id === rowId);
        if (!row) return;
        const nextValue = !Boolean(row.hideName);
        setTogglingNameVisibility(prev => ({ ...prev, [rowId]: true }));
        try {
            const res = await rowsAPI.update(tableId, rowId, { hideName: nextValue });
            setTable(res.data);
            addToast(nextValue ? 'Ism yashirildi' : 'Ism ko\'rsatildi', 'success');
        } catch {
            addToast('Sozlashda xatolik', 'error');
        } finally {
            setTogglingNameVisibility(prev => ({ ...prev, [rowId]: false }));
        }
    };

    const maskName = (name) => {
        if (!name) return 'Ism / Nomi (kiritilmagan)';
        const words = name.trim().split(/\s+/);
        return words.map(word => {
            if (!word) return '';
            const letters = word.replace(/[^A-Za-zА-Яа-яЁё]/g, '');
            if (!letters) return word;
            if (word.length <= 6) {
                const prefix = word[0];
                const suffix = word[word.length - 1];
                const middle = '*'.repeat(Math.max(3, word.length - 2));
                return `${prefix}${middle}${suffix}`;
            }
            const prefix = word.slice(0, 2);
            const suffix = word.slice(-2);
            const middle = '*'.repeat(Math.max(3, word.length - 4));
            return `${prefix}${middle}${suffix}`;
        }).join(' ');
    };

    const renderNameText = (name, hidden) => {
        const fallback = 'Ism / Nomi (kiritilmagan)';
        const value = hidden ? maskName(name) : (name ? name : fallback);
        if (!value) {
            return <span className="name-word">{fallback}</span>;
        }
        const words = value.trim().split(/\s+/);
        return words.map((word, index) => (
            <span key={`${word}-${index}`} className="name-word">{word}</span>
        ));
    };

    // Masking function for "DD.MM.YYYY HH:MM"
    const formatDateTimeInput = (value) => {
        let v = value.replace(/\D/g, ''); // remove non-digits
        if (v.length > 12) v = v.substring(0, 12);

        let res = '';
        if (v.length > 0) res += v.substring(0, 2);
        if (v.length > 2) res += '.' + v.substring(2, 4);
        if (v.length > 4) res += '.' + v.substring(4, 8);
        if (v.length > 8) res += ' ' + v.substring(8, 10);
        if (v.length > 10) res += ':' + v.substring(10, 12);

        return res;
    };

    const renderFormattedText = (text) => {
        if (!text) return { __html: '' };
        // Escape HTML
        let escaped = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

        // 1. Hyperlink [text](URL)
        escaped = escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: var(--accent-primary); text-decoration: underline;">$1</a>');
        // 2. Bold *text*
        escaped = escaped.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
        // 3. Underline __text__
        escaped = escaped.replace(/__([^_]+)__/g, '<u>$1</u>');
        // 4. Italic _text_
        escaped = escaped.replace(/_([^_]+)_/g, '<em>$1</em>');
        // 5. Strikethrough ~text~
        escaped = escaped.replace(/~([^~]+)~/g, '<s>$1</s>');
        // 6. Newlines
        escaped = escaped.replace(/\n/g, '<br />');

        return { __html: escaped };
    };

    const TELEGRAM_LINK_PATTERN = /^\[([^\]]+)\]\((tg:\/\/.+|https:\/\/t\.me\/.+)\)$/;
    const validateTelegramLinkValue = (value) => {
        if (typeof value !== 'string') return true;
        const trimmed = value.trim();
        if (!trimmed) return true;
        if (!TELEGRAM_LINK_PATTERN.test(trimmed)) {
            window.alert("Noto'g'ri Telegram link formati. Namuna: [text](https://t.me/username) yoki [text](tg://resolve?domain=username)");
            return false;
        }
        return true;
    };

    const validateTelegramPayload = (rowsToValidate) => {
        for (const row of rowsToValidate || []) {
            if (!validateTelegramLinkValue(row?.telegramLink)) return false;
        }
        return true;
    };

    const getTelegramButtonLabel = (value) => {
        if (typeof value !== 'string') return "Telegramga o'tish";
        const trimmed = value.trim();
        if (!trimmed) return "Telegramga o'tish";
        const match = trimmed.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        return match ? match[1] : trimmed;
    };

    const openTelegramLink = (value) => {
        if (typeof value !== 'string') return;
        const trimmed = value.trim();
        if (!trimmed) {
            window.alert("Telegram link mavjud emas. Avval matn kiriting.");
            return;
        }
        const match = trimmed.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        let url = match?.[2];
        if (!url || (!url.startsWith('tg://') && !url.startsWith('https://t.me/'))) {
            window.alert("Noto'g'ri Telegram link formati. Namuna: [text](https://t.me/username)");
            return;
        }

        if (url.startsWith('tg://user?id=')) {
            const userId = url.split('=')[1];
            url = `tg://openmessage?user_id=${userId}`;
        }

        if (url.startsWith('https://')) {
            window.open(url, '_blank', 'noopener,noreferrer');
        } else {
            window.location.href = url;
        }
    };

    const startEditingTelegramLink = (row) => {
        const rowKey = row?._id || row?.id;
        setEditingTelegramLinkRowId(rowKey);
        setTelegramLinkDrafts(prev => ({ ...prev, [rowKey]: row?.telegramLink || '' }));
    };

    const cancelEditingTelegramLink = () => {
        setEditingTelegramLinkRowId(null);
    };

    const saveTelegramLink = async (row) => {
        const rowKey = row?._id || row?.id;
        const nextValue = telegramLinkDrafts[rowKey] ?? row?.telegramLink ?? '';
        const normalizedValue = typeof nextValue === 'string' ? nextValue.trim() : '';
        if (!validateTelegramLinkValue(normalizedValue)) return;

        try {
            const res = await rowsAPI.update(tableId, rowKey, { telegramLink: normalizedValue });
            if (res.data) setTable(res.data);
            setTelegramLinkDrafts(prev => ({ ...prev, [rowKey]: normalizedValue }));
            setEditingTelegramLinkRowId(null);
            addToast('Telegram link saqlandi', 'success');
        } catch (error) {
            const message = error?.response?.data?.message || 'Telegram link saqlanmadi';
            addToast(message, 'error');
        }
    };

    // ===============================================
    // LOCAL STATE CHANGES (will trigger isDirty = true)
    // ===============================================

    const startEditingRowName = (row) => {
        setEditingRowIds(prev => ({ ...prev, [row._id]: true }));
        setRowNameDrafts(prev => ({ ...prev, [row._id]: row.name || '' }));
    };

    const cancelEditingRowName = (rowId) => {
        setEditingRowIds(prev => ({ ...prev, [rowId]: false }));
        setRowNameDrafts(prev => {
            const next = { ...prev };
            delete next[rowId];
            return next;
        });
    };

    const saveEditingRowName = (rowId) => {
        setEditingRowIds(prev => ({ ...prev, [rowId]: false }));
        handleRowUpdateLocal(rowId, 'name', rowNameDrafts[rowId] ?? '');
        handleGlobalSave();
    };

    // Add Row via API
    const handleCreateRowLocal = async () => {
        if (isSaving.current || creatingRow) return;
        isSaving.current = true;
        setCreatingRow(true);
        try {
            const defaultRole = activeRoleFilter !== 'all' ? activeRoleFilter : '';
            const res = await rowsAPI.create(tableId, {
                name: '',
                role: defaultRole,
                telegramLink: '',
                tasks: [{ name: '', description: '', startDate: '', endDate: '', delay: '' }]
            });
            setTable(res.data);
            addToast('Yangi qator yaratildi', 'success');
        } catch {
            addToast('Qator yaratishda xatolik', 'error');
        } finally {
            isSaving.current = false;
            setCreatingRow(false);
        }
    };

    // Remove Row via API
    const handleDeleteRowLocal = (rowId) => {
        setConfirmAction({
            message: "Rostdan ham bu qatorni o'chirasizmi?",
            onConfirm: async () => {
                setConfirmAction(null);
                setDeletingRowIds(prev => ({ ...prev, [rowId]: true }));
                try {
                    await rowsAPI.delete(tableId, rowId);
                    setTable(prev => ({ ...prev, rows: prev.rows.filter(r => r._id !== rowId) }));
                    addToast("Qator o'chirildi", 'success');
                } catch {
                    addToast('Xatolik', 'error');
                } finally {
                    setDeletingRowIds(prev => ({ ...prev, [rowId]: false }));
                }
            }
        });
    };

    // Edit Row Name/Role locally
    const handleRowUpdateLocal = (rowId, field, value) => {
        setTable(prev => ({
            ...prev,
            rows: prev.rows.map(r => r._id === rowId ? { ...r, [field]: value } : r)
        }));
    };

    const handleRowRoleSelect = (rowId, value) => {
        const newRows = table.rows.map(r => r._id === rowId ? { ...r, role: value } : r);
        setTable(prev => ({ ...prev, rows: newRows }));
        handleGlobalSave(newRows);
    };

    // Add Task via API
    const handleAddTaskLocal = async (rowId) => {
        if (isSaving.current || creatingTasks[rowId]) return;
        isSaving.current = true;
        setCreatingTasks(prev => ({ ...prev, [rowId]: true }));
        try {
            const res = await tasksAPI.add(tableId, rowId);
            const newTask = res?.data?.task || res?.data;

            setTable(prev => ({
                ...prev,
                rows: prev.rows.map(row => {
                    if (row._id === rowId) {
                        return {
                            ...row,
                            tasks: [...(row.tasks || []), newTask]
                        };
                    }
                    return row;
                })
            }));

            addToast('Vazifa qo\'shildi', 'success');
        } catch {
            addToast('Xatolik', 'error');
        } finally {
            isSaving.current = false;
            setCreatingTasks(prev => ({ ...prev, [rowId]: false }));
        }
    };

    // Remove Task via API
    const handleDeleteTaskLocal = (rowId, taskId) => {
        setConfirmAction({
            message: "Vazifani o'chirasizmi?",
            onConfirm: async () => {
                setConfirmAction(null);
                setDeletingTaskIds(prev => ({ ...prev, [taskId]: true }));
                try {
                    await tasksAPI.delete(tableId, rowId, taskId);
                    setTable(prev => ({
                        ...prev,
                        rows: prev.rows.map(row => {
                            if (row._id === rowId) {
                                return { ...row, tasks: row.tasks.filter(t => t._id !== taskId) };
                            }
                            return row;
                        })
                    }));
                    addToast("Vazifa o'chirildi", 'success');
                } catch {
                    addToast('Xatolik', 'error');
                } finally {
                    setDeletingTaskIds(prev => ({ ...prev, [taskId]: false }));
                }
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
    };

    const toggleRow = (rowId) => {
        setExpandedRows(prev => ({ ...prev, [rowId]: !prev[rowId] }));
    };

    // MODAL STATE MANAGMENT
    const openTaskModal = (task, rowId) => {
        setModalTask({ ...task });
        setModalRowId(rowId);
        setModalOpen(true);
        setIsEditingModalName(false);
        setIsEditingModalDesc(false);
    };

    // GLOBAL SAVE helper
    const handleGlobalSave = async (rowsOverride = null) => {
        if (isSaving.current) return;
        isSaving.current = true;
        try {
            const currentRows = rowsOverride || table.rows;
            if (!validateTelegramPayload(currentRows)) {
                isSaving.current = false;
                return;
            }
            const oldIds = currentRows.map(r => r._id);

            const rowsToSave = currentRows.map(row => {
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

            // Map old expandedRows to new IDs by index
            const newRows = res.data.rows || [];
            setExpandedRows(prev => {
                const mapped = {};
                oldIds.forEach((oldId, i) => {
                    if (prev[oldId] !== undefined && newRows[i]) {
                        mapped[newRows[i]._id] = prev[oldId];
                    }
                });
                // Keep any existing real IDs that didn't change
                newRows.forEach(r => {
                    if (prev[r._id] !== undefined && mapped[r._id] === undefined) {
                        mapped[r._id] = prev[r._id];
                    }
                });
                return mapped;
            });

            setTable(res.data);
            addToast("Muvaffaqiyatli saqlandi", 'success');
        } catch {
            addToast('Saqlashda xatolik', 'error');
        } finally {
            isSaving.current = false;
        }
    };

    const handleModalClose = () => {
        setModalOpen(false);
        setIsEditingModalName(false);
        setIsEditingModalDesc(false);
        const newRows = table.rows.map(row => {
            if (row._id === modalRowId) {
                return {
                    ...row,
                    tasks: row.tasks.map(t => t._id === modalTask._id ? { ...t, name: modalTask.name, description: modalTask.description } : t)
                };
            }
            return row;
        });
        setTable(prev => ({ ...prev, rows: newRows }));
        handleGlobalSave(newRows);
    };



    const sortByName = (a, b) => {
        const nameA = (a.name || '').toString().trim().toLowerCase();
        const nameB = (b.name || '').toString().trim().toLowerCase();
        return nameA.localeCompare(nameB, 'uz', { sensitivity: 'base' });
    };

    const sortedRoles = (table?.roles || [])
        .filter(role => role && role.toString().trim())
        .slice()
        .sort((a, b) => a.localeCompare(b, 'uz', { sensitivity: 'base' }));

    const groupedRowsByRole = (() => {
        const allRows = (table?.rows || []).slice();

        if (activeRoleFilter !== 'all') {
            return [{
                role: activeRoleFilter,
                rows: allRows
                    .filter(row => row.role === activeRoleFilter)
                    .sort(sortByName)
            }];
        }

        const groups = sortedRoles.map(role => ({
            role,
            rows: allRows
                .filter(row => (row.role || '').toString().trim() === role)
                .sort(sortByName)
        })).filter(group => group.rows.length > 0);

        const unassignedRows = allRows
            .filter(row => {
                const value = (row.role || '').toString().trim();
                return !sortedRoles.includes(value);
            })
            .sort(sortByName);

        if (unassignedRows.length > 0) {
            groups.push({ role: 'Rolsiz', rows: unassignedRows });
        }

        return groups;
    })();

    const totalVisibleRows = groupedRowsByRole.reduce((count, group) => count + group.rows.length, 0);

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
                    <button className="btn btn-sm btn-secondary" onClick={handleCopyTableId} title="ID nusxalash">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        Nusxalash
                    </button>
                    <button className="btn btn-sm btn-secondary" onClick={fetchTable}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="23 4 23 10 17 10" />
                            <polyline points="1 20 1 14 7 14" />
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                        </svg>
                        Yangilash
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
                    {sortedRoles.map((role, index) => (
                        <div key={`${role}-${index}`} className="role-item">
                            <span
                                className={`badge badge-role ${activeRoleFilter === role ? 'active' : ''}`}
                                onClick={() => setActiveRoleFilter(role)}
                            >
                                {role}
                            </span>
                            <button
                                className="role-delete-btn"
                                onClick={() => handleDeleteRole(table.roles?.findIndex(r => r === role) ?? index)}
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
                {groupedRowsByRole.map((group, groupIndex) => (
                    <div key={`${group.role || 'role'}-${groupIndex}`} className="role-group">
                        {activeRoleFilter === 'all' && (
                            <div className="role-group-header">
                                <span className="role-group-title">{group.role}</span>
                            </div>
                        )}
                        {group.rows.map((row, rowIndex) => (
                            <div key={row._id} className="row-card" style={{ animationDelay: `${(groupIndex + rowIndex) * 0.03}s` }}>
                                {/* Editable row header */}
                                <div className="row-header" onClick={(e) => { if (e.target.closest('.row-actions') || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.closest('button')) return; toggleRow(row._id); }} style={{ flexWrap: 'wrap', gap: '10px', cursor: 'pointer' }}>

                                    <div className="row-inputs-section" style={{ flex: 1, display: 'flex', gap: '10px', minWidth: '300px', alignItems: 'center' }}>
                                        <div className="row-name-role-group">
                                            {editingRowIds[row._id] ? (
                                                <div className="row-name-control" style={{ display: 'flex', gap: '6px', flex: 1 }} onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        className="input"
                                                        value={rowNameDrafts[row._id] ?? row.name ?? ''}
                                                        style={{ flex: 1 }}
                                                        onChange={(e) => setRowNameDrafts(prev => ({ ...prev, [row._id]: e.target.value }))}
                                                        placeholder="Ism / Nomi"
                                                        autoFocus
                                                        onKeyDown={(e) => e.key === 'Enter' && saveEditingRowName(row._id)}
                                                    />
                                                    <button
                                                        className="btn btn-sm btn-secondary"
                                                        onClick={() => cancelEditingRowName(row._id)}
                                                        title="Bekor qilish"
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-success"
                                                        onClick={() => saveEditingRowName(row._id)}
                                                        title="Tahrirni saqlash"
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="row-name-control" style={{ display: 'flex', gap: '8px', flex: 1, alignItems: 'center', minWidth: 0 }}>
                                                    <span className="name-stack" style={{ fontWeight: 600, fontSize: '15px', lineHeight: 1.4, minWidth: 0 }}>
                                                        {renderNameText(row.name, row.hideName)}
                                                    </span>
                                                    <button
                                                        className={`btn btn-sm ${row.hideName ? 'btn-danger' : 'btn-primary'}`}
                                                        onClick={(e) => { e.stopPropagation(); handleToggleHideNameForRow(row._id); }}
                                                        title={row.hideName ? 'Ismni ko\'rsatish' : 'Ismni yashirish'}
                                                        style={{ padding: '4px 10px', fontSize: '12px', minWidth: '92px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                                                        disabled={togglingNameVisibility[row._id]}
                                                    >
                                                        {togglingNameVisibility[row._id] ? <SpinnerIcon /> : (row.hideName ? 'Ko\'rsatish' : 'Yashirish')}
                                                    </button>
                                                </div>
                                            )}

                                        </div>
                                    </div>

                                    <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                                        {table.roles && table.roles.length > 0 && (
                                            <select
                                                className="input compact-select"
                                                style={{ width: 'auto', minWidth: '0' }}
                                                value={row.role || ''}
                                                onChange={(e) => handleRowRoleSelect(row._id, e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <option value="">Rol tanlang...</option>
                                                {table.roles.map(r => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                        )}
                                        {!editingRowIds[row._id] && (
                                            <button className="btn btn-sm btn-secondary edit-row-btn" onClick={() => startEditingRowName(row)} title="Ismni tahrirlash">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                                                Tahrirlash
                                            </button>
                                        )}
                                        {editingTelegramLinkRowId === (row?._id || row?.id) ? (
                                            <div className="telegram-link-editor" style={{ display: 'flex', gap: '6px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    className="input"
                                                    type="text"
                                                    value={telegramLinkDrafts[row?._id || row?.id] ?? ''}
                                                    onChange={(e) => setTelegramLinkDrafts(prev => ({ ...prev, [row?._id || row?.id]: e.target.value }))}
                                                    placeholder="[text](tg://user?id=USER_ID)"
                                                    style={{ minWidth: '220px' }}
                                                />
                                                <button className="btn btn-sm btn-success" onClick={() => saveTelegramLink(row)} title="Saqlash">✓</button>
                                                <button className="btn btn-sm btn-ghost" onClick={cancelEditingTelegramLink} title="Bekor qilish">✕</button>
                                            </div>
                                        ) : (
                                            <div className="telegram-link-action-group">
                                                <button
                                                    className="btn btn-sm btn-secondary telegram-action-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (row.telegramLink && row.telegramLink.trim()) {
                                                            openTelegramLink(row.telegramLink);
                                                        }
                                                    }}
                                                    title="Telegram link"
                                                >
                                                    {getTelegramButtonLabel(row.telegramLink)}
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-ghost telegram-edit-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        startEditingTelegramLink(row);
                                                    }}
                                                    title="Telegram linkni tahrirlash"
                                                >
                                                    ✎
                                                </button>
                                            </div>
                                        )}
                                        <button className="btn btn-sm btn-primary" onClick={() => handleAddTaskLocal(row._id)} disabled={creatingTasks[row._id]}>
                                            {creatingTasks[row._id] ? <SpinnerIcon /> : "Vazifa qo'shish"}
                                        </button>
                                        <button className="btn btn-sm btn-danger" onClick={() => handleDeleteRowLocal(row._id)} disabled={deletingRowIds[row._id]} title="O'chirish">
                                            {deletingRowIds[row._id] ? <SpinnerIcon /> : (
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <polyline points="3 6 5 6 21 6" />
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                </svg>
                                            )}
                                        </button>
                                        <div className="row-chevron" style={{ display: 'flex', alignItems: 'center', padding: '0 8px' }}>
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
                                        {!row.tasks?.length ? (
                                            <div className="no-tasks">Vazifalar yo'q</div>
                                        ) : (
                                            <div className="tasks-table">
                                                <div className="tasks-header" style={{ display: 'flex', gap: '8px', padding: '8px 12px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, alignItems: 'center' }}>
                                                    <div style={{ width: '36px', flexShrink: 0 }}>#</div>
                                                    <div style={{ flex: 2, minWidth: '120px' }}>Vazifa</div>
                                                    <div style={{ flex: 1, minWidth: '100px' }}>Boshlanish</div>
                                                    <div style={{ flex: 1, minWidth: '100px' }}>Tugash</div>
                                                    <div style={{ flex: 1, minWidth: '100px' }}>Istisno kechiktirish</div>
                                                    <div style={{ width: '180px', flexShrink: 0 }}></div>
                                                </div>
                                                {(row.tasks || []).map((task, tIndex) => (
                                                    <div key={task._id} className="task-row" style={{ display: 'flex', gap: '8px', padding: '8px 12px', alignItems: 'center' }}>
                                                        <div style={{ width: '36px', flexShrink: 0, fontWeight: 600, color: 'var(--accent-primary)' }}>{tIndex + 1}</div>

                                                        <div style={{ flex: 2, minWidth: '120px' }}>
                                                            <button
                                                                className="btn btn-sm btn-primary"
                                                                style={{ width: '100%', wordBreak: 'break-all', border: '1px solid rgba(108, 92, 231, 0.35)', fontWeight: 700 }}
                                                                onClick={() => openTaskModal(task, row._id)}
                                                            >
                                                                Vazifani ko'rish uchun bosing
                                                            </button>
                                                        </div>

                                                        <div style={{ flex: 1, minWidth: '100px' }}>
                                                            <label className="mobile-label">Boshlanish</label>
                                                            <input
                                                                type="text"
                                                                className="input"
                                                                placeholder="00.00.0000 00:00"
                                                                value={task.startDate}
                                                                disabled={!editingTaskIds[task._id]}
                                                                style={{ opacity: !editingTaskIds[task._id] ? 0.7 : 1 }}
                                                                onChange={(e) => handleTaskUpdateLocal(row._id, task._id, 'startDate', formatDateTimeInput(e.target.value))}
                                                            />
                                                        </div>

                                                        <div style={{ flex: 1, minWidth: '100px' }}>
                                                            <label className="mobile-label">Tugash</label>
                                                            <input
                                                                type="text"
                                                                className="input"
                                                                placeholder="00.00.0000 00:00"
                                                                value={task.endDate}
                                                                disabled={!editingTaskIds[task._id]}
                                                                style={{ opacity: !editingTaskIds[task._id] ? 0.7 : 1 }}
                                                                onChange={(e) => handleTaskUpdateLocal(row._id, task._id, 'endDate', formatDateTimeInput(e.target.value))}
                                                            />
                                                        </div>

                                                        <div style={{ flex: 1, minWidth: '100px' }}>
                                                            <label className="mobile-label">Istisno kechiktirish</label>
                                                            <input
                                                                type="text"
                                                                className="input"
                                                                placeholder="00.00.0000 00:00"
                                                                value={task.delay}
                                                                disabled={!editingTaskIds[task._id]}
                                                                style={{ opacity: !editingTaskIds[task._id] ? 0.7 : 1 }}
                                                                onChange={(e) => handleTaskUpdateLocal(row._id, task._id, 'delay', formatDateTimeInput(e.target.value))}
                                                            />
                                                        </div>

                                                        <div style={{ width: '180px', flexShrink: 0, display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                                            {editingTaskIds[task._id] ? (
                                                                <>
                                                                    <button
                                                                        className="btn btn-sm btn-secondary"
                                                                        onClick={() => {
                                                                            setEditingTaskIds(prev => ({ ...prev, [task._id]: false }));
                                                                            fetchTable(); // Reset un-saved changes
                                                                        }}
                                                                    >
                                                                        Bekor qilish
                                                                    </button>
                                                                    <button
                                                                        className="btn btn-sm btn-success"
                                                                        onClick={() => {
                                                                            setEditingTaskIds(prev => ({ ...prev, [task._id]: false }));
                                                                            handleGlobalSave();
                                                                        }}
                                                                    >
                                                                        Saqlash
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <button
                                                                        className="btn btn-sm btn-danger"
                                                                        onClick={() => handleDeleteTaskLocal(row._id, task._id)}
                                                                        disabled={deletingTaskIds[task._id]}
                                                                    >
                                                                        {deletingTaskIds[task._id] ? <SpinnerIcon /> : "O'chirish"}
                                                                    </button>
                                                                    <button
                                                                        className="btn btn-sm btn-secondary"
                                                                        onClick={() => setEditingTaskIds(prev => ({ ...prev, [task._id]: true }))}
                                                                    >
                                                                        Tahrirlash
                                                                    </button>
                                                                </>
                                                            )}
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
                ))}
            </div>

            {totalVisibleRows === 0 && (
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

            {/* Global Actions (Create Row) */}
            <div className="global-actions" style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '20px' }}>
                <button className="btn btn-secondary create-table-btn" onClick={handleCreateRowLocal} disabled={creatingRow} style={{ minWidth: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    {creatingRow && <SpinnerIcon />}
                    {creatingRow ? "Yaratilmoqda..." : "Yangi qator yaratish"}
                </button>
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
                                {isEditingModalName ? (
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="Vazifa nomini kiriting..."
                                        value={modalTask.name}
                                        onChange={(e) => setModalTask({ ...modalTask, name: e.target.value })}
                                        onBlur={() => setIsEditingModalName(false)}
                                        autoFocus
                                    />
                                ) : (
                                    <div
                                        className="input markdown-live-preview"
                                        onClick={() => setIsEditingModalName(true)}
                                        dangerouslySetInnerHTML={renderFormattedText(modalTask.name || "Vazifa nomini kiriting...")}
                                        style={{ cursor: 'text', minHeight: '38px' }}
                                    />
                                )}
                            </div>
                            <div className="modal-field" style={{ marginTop: '16px' }}>
                                <label>Tafsilot (Text)</label>
                                {isEditingModalDesc ? (
                                    <textarea
                                        className="input textarea"
                                        placeholder="Vazifa tafsilotini kiriting..."
                                        value={modalTask.description}
                                        onChange={(e) => setModalTask({ ...modalTask, description: e.target.value })}
                                        onBlur={() => setIsEditingModalDesc(false)}
                                        style={{ minHeight: '120px' }}
                                        autoFocus
                                    />
                                ) : (
                                    <div
                                        className="input textarea markdown-live-preview"
                                        onClick={() => setIsEditingModalDesc(true)}
                                        dangerouslySetInnerHTML={renderFormattedText(modalTask.description || "Vazifa tafsilotini kiriting...")}
                                        style={{ cursor: 'text', minHeight: '120px' }}
                                    />
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-success" onClick={handleModalClose}>Saqlash</button>
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
