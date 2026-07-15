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
        if (!trimmed) return;
        const match = trimmed.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        let url = match?.[2];
        if (!url || (!url.startsWith('tg://') && !url.startsWith('https://t.me/'))) return;

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
                        {sortedRoles.map((role, index) => (
                            <div key={`${role}-${index}`} className="role-item">
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
                {groupedRowsByRole.map((group, groupIndex) => (
                    <div key={`${group.role || 'role'}-${groupIndex}`} className="role-group">
                        {activeRoleFilter === 'all' && (
                            <div className="role-group-header">
                                <span className="role-group-title">{group.role}</span>
                            </div>
                        )}
                        {group.rows.map((row, rowIndex) => (
                            <div key={row._id} className="row-card" style={{ animationDelay: `${(groupIndex + rowIndex) * 0.03}s` }}>

                                <div className="row-header" onClick={() => toggleRow(row._id)} style={{ flexWrap: 'nowrap', gap: '10px', cursor: 'pointer' }}>
                                    <div className="row-text-content" style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', minWidth: 0 }}>
                                            <span className="name-stack" style={{ fontWeight: 600, fontSize: '15px', lineHeight: 1.4, minWidth: 0 }}>
                                                {renderNameText(row.name, row.hideName)}
                                            </span>
                                        </div>
                                        {row.role && (
                                            <div className="row-role-pill" style={{ alignSelf: 'flex-start' }}>
                                                Rol: <b>{row.role}</b>
                                            </div>
                                        )}
                                        {row.telegramLink && row.telegramLink.trim() && (
                                            <button
                                                className="btn btn-sm btn-secondary"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openTelegramLink(row.telegramLink);
                                                }}
                                                title="Telegram link"
                                                style={{ alignSelf: 'flex-start', marginTop: '4px' }}
                                            >
                                                {getTelegramButtonLabel(row.telegramLink)}
                                            </button>
                                        )}
                                    </div>
                                    <div className="row-chevron" style={{ display: 'flex', alignItems: 'center', padding: '0 8px', flexShrink: 0 }}>
                                        <svg
                                            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                            style={{ transform: expandedRows[row._id] === true ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.25s ease' }}
                                        >
                                            <polyline points="6 9 12 15 18 9" />
                                        </svg>
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
                ))}
            </div>

            {totalVisibleRows === 0 && (
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
                                <div
                                    className="modal-readonly-value markdown-live-preview"
                                    style={{ padding: '10px 14px', background: 'var(--bg-input)', borderRadius: '6px', color: 'var(--text-primary)' }}
                                    dangerouslySetInnerHTML={renderFormattedText(modalTask.name || "Ko'rsatilmagan")}
                                />
                            </div>
                            <div className="modal-field" style={{ marginTop: '16px' }}>
                                <label>Tafsilotlar</label>
                                <div
                                    className="modal-readonly-value markdown-live-preview description"
                                    style={{ padding: '10px 14px', background: 'var(--bg-input)', borderRadius: '6px', color: 'var(--text-primary)', minHeight: '80px' }}
                                    dangerouslySetInnerHTML={renderFormattedText(modalTask.description || "Tafsilot yo'q")}
                                />
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
