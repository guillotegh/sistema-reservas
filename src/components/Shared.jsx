import { useState, useEffect, useRef } from 'react';

export const formatCurrency = (amount, currency = 'ARS') => {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

export const formatDate = (dateString) => {
    if (!dateString || typeof dateString !== 'string') return '';
    try {
        const [year, month, day] = dateString.split('-');
        if (!year || !month || !day) return dateString;
        return `${day}/${month}/${year}`;
    } catch (e) {
        return dateString;
    }
};

export const toLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const formatDateForInput = (isoDate) => {
    if (!isoDate) return '';
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
};

export const parseDateFromInput = (inputVal) => {
    if (!inputVal) return null;
    const parts = inputVal.split('/');
    if (parts.length === 3) {
        const [day, month, year] = parts;
        if (year.length === 4 && month.length <= 2 && day.length <= 2) {
            const d = new Date(year, month - 1, day);
            if (!isNaN(d.getTime())) {
                return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            }
        }
    }
    return null;
};

export const maskDateInput = (value) => {
    const numbers = value.replace(/\D/g, '');
    const charCount = numbers.length;
    if (charCount === 0) return '';
    let masked = '';
    if (charCount > 0) masked += numbers.substring(0, 2);
    if (charCount >= 3) masked += '/' + numbers.substring(2, 4);
    if (charCount >= 5) masked += '/' + numbers.substring(4, 8);
    return masked;
};

export const getProgressColorClass = (percentage) => {
    if (percentage >= 100) return 'text-green';
    if (percentage >= 76) return 'text-lime';
    if (percentage >= 41) return 'text-orange';
    return 'text-red';
};

export const isToday = (dateString) => {
    const today = toLocalDateString(new Date());
    return dateString === today;
};

export const isYesterday = (dateString) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return dateString === toLocalDateString(yesterday);
};

export const isThisWeek = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();

    const mondayOfThisWeek = new Date(today);
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    mondayOfThisWeek.setDate(today.getDate() + diff);
    mondayOfThisWeek.setHours(0, 0, 0, 0);

    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    return date >= mondayOfThisWeek && date <= endOfToday && !isToday(dateString) && !isYesterday(dateString);
};

export const isAnterior = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();

    const mondayOfThisWeek = new Date(today);
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    mondayOfThisWeek.setDate(today.getDate() + diff);
    mondayOfThisWeek.setHours(0, 0, 0, 0);

    return date < mondayOfThisWeek;
};

export function EditableAmount({ value, onSave, currency }) {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value);

    useEffect(() => {
        setTempValue(value);
    }, [value]);

    const handleDoubleClick = () => {
        setIsEditing(true);
    };

    const handleBlur = () => {
        setIsEditing(false);
        onSave(parseFloat(tempValue) || 0);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleBlur();
        }
    };

    if (isEditing) {
        return (
            <input
                type="number"
                className="editable-input"
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                autoFocus
            />
        );
    }

    return (
        <div
            className="resumen-value money-neutral"
            onDoubleClick={handleDoubleClick}
            title="Doble clic para editar"
            style={{ cursor: 'pointer', borderBottom: '1px dashed #ccc' }}
        >
            {formatCurrency(value, currency)}
        </div>
    );
}

export function EditableText({ value, onSave, label }) {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value);

    useEffect(() => {
        setTempValue(value);
    }, [value]);

    const handleDoubleClick = () => {
        setIsEditing(true);
    };

    const handleBlur = () => {
        setIsEditing(false);
        if (tempValue && tempValue !== value) {
            onSave(tempValue);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleBlur();
        }
    };

    if (isEditing) {
        return (
            <input
                type="text"
                className="editable-text-input"
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                autoFocus
            />
        );
    }

    return (
        <div
            onDoubleClick={handleDoubleClick}
            title="Doble clic para editar"
            style={{ cursor: 'pointer', borderBottom: '1px dashed #ccc', display: 'inline-block' }}
        >
            <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>{label}</div>
            <div style={{ fontWeight: 600 }}>{value}</div>
        </div>
    );
}

export function EditableDate({ value, onSave, label }) {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value);

    useEffect(() => {
        setTempValue(value);
    }, [value]);

    const handleDoubleClick = () => {
        setIsEditing(true);
    };

    const handleBlur = () => {
        setIsEditing(false);
        if (tempValue && tempValue !== value) {
            onSave(tempValue);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleBlur();
        }
    };

    if (isEditing) {
        return (
            <input
                type="date"
                className="editable-date-input"
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                autoFocus
            />
        );
    }

    return (
        <div
            onDoubleClick={handleDoubleClick}
            title="Doble clic para editar"
            style={{ cursor: 'pointer', borderBottom: '1px dashed #ccc', display: 'inline-block' }}
        >
            <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>{label}</div>
            <div style={{ fontWeight: 600 }}>{formatDate(value)}</div>
        </div>
    );
}

export function EditableCurrency({ value, onSave }) {
    const [isEditing, setIsEditing] = useState(false);

    const handleDoubleClick = () => {
        setIsEditing(true);
    };

    const handleChange = (newCurrency) => {
        setIsEditing(false);
        onSave(newCurrency);
    };

    if (isEditing) {
        return (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                    className="btn btn-small btn-success"
                    onClick={() => handleChange('ARS')}
                >
                    ARS
                </button>
                <button
                    className="btn btn-small btn-primary"
                    onClick={() => handleChange('USD')}
                >
                    USD
                </button>
            </div>
        );
    }

    return (
        <div
            onDoubleClick={handleDoubleClick}
            title="Doble clic para editar"
            style={{ cursor: 'pointer', borderBottom: '1px dashed #ccc', display: 'inline-block' }}
        >
            <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>Moneda</div>
            <div style={{ fontWeight: 600 }}>{value === 'USD' ? 'USD' : '$ ARS'}</div>
        </div>
    );
}

export function EditablePaymentAmount({ value, onSave, currency }) {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value);

    useEffect(() => {
        setTempValue(value);
    }, [value]);

    const handleDoubleClick = (e) => {
        e.stopPropagation();
        setIsEditing(true);
    };

    const handleBlur = () => {
        setIsEditing(false);
        const newVal = parseFloat(tempValue) || 0;
        if (newVal !== value) {
            onSave(newVal);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleBlur();
        }
    };

    if (isEditing) {
        return (
            <input
                type="number"
                className="editable-input"
                style={{ fontSize: '1.1rem', width: '120px' }}
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                autoFocus
            />
        );
    }

    return (
        <div
            style={{ fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer', borderBottom: '1px dashed #ccc', display: 'inline-block' }}
            onDoubleClick={handleDoubleClick}
            title="Doble clic para editar"
        >
            {formatCurrency(value, currency)}
        </div>
    );
}

export function ConfirmationModal({ isOpen, message, onConfirm, onCancel }) {
    if (!isOpen) return null;
    return (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
            <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-body">
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#1a202c' }}>Confirmar Acción</h3>
                    <p style={{ color: '#4b5563' }}>{message}</p>
                    <div className="confirm-actions">
                        <button className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
                        <button className="btn btn-danger" onClick={onConfirm}>Eliminar</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function DateRangePicker({ startDate, endDate, onChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [hoverDate, setHoverDate] = useState(null);
    const [selectionPhase, setSelectionPhase] = useState('selecting-start');

    const [startInputVal, setStartInputVal] = useState('');
    const [endInputVal, setEndInputVal] = useState('');
    const pickerRef = useRef(null);

    useEffect(() => {
        setStartInputVal(formatDateForInput(startDate));
    }, [startDate]);

    useEffect(() => {
        setEndInputVal(formatDateForInput(endDate));
    }, [endDate]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target)) {
                setIsOpen(false);
                setHoverDate(null);
                setSelectionPhase('selecting-start');
                setStartInputVal(formatDateForInput(startDate));
                setEndInputVal(formatDateForInput(endDate));
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [startDate, endDate]);

    useEffect(() => {
        if (isOpen) {
            let targetDateStr = selectionPhase === 'selecting-end' ? endDate : startDate;
            if (!targetDateStr) targetDateStr = startDate;

            if (targetDateStr) {
                const [y, m, d] = targetDateStr.split('-');
                setCurrentMonth(new Date(y, m - 1, d));
            } else {
                setCurrentMonth(new Date());
            }
        }
    }, [isOpen]);

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            days.push({ day: prevMonthLastDay - i, isCurrentMonth: false, date: new Date(year, month - 1, prevMonthLastDay - i) });
        }
        for (let day = 1; day <= daysInMonth; day++) {
            days.push({ day, isCurrentMonth: true, date: new Date(year, month, day) });
        }
        const remainingDays = 42 - days.length;
        for (let day = 1; day <= remainingDays; day++) {
            days.push({ day, isCurrentMonth: false, date: new Date(year, month + 1, day) });
        }
        return days;
    };

    const handleInputClick = (type) => {
        setIsOpen(true);
        if (type === 'start') {
            setSelectionPhase('selecting-start');
        } else {
            if (startDate) {
                setSelectionPhase('selecting-end');
            } else {
                setSelectionPhase('selecting-start');
            }
        }
    };

    const handleDayClick = (date) => {
        const dateString = toLocalDateString(date);

        if (selectionPhase === 'selecting-start') {
            onChange({ startDate: dateString, endDate: '' });
            setSelectionPhase('selecting-end');
        } else {
            if (dateString < startDate) {
                onChange({ startDate: dateString, endDate: '' });
            } else {
                onChange({ startDate, endDate: dateString });
                setIsOpen(false);
                setSelectionPhase('selecting-start');
            }
        }
    };

    const handleDayHover = (date) => {
        if (selectionPhase === 'selecting-end' && startDate) {
            setHoverDate(toLocalDateString(date));
        }
    };

    const handleStartInputChange = (e) => {
        const maskedVal = maskDateInput(e.target.value);
        setStartInputVal(maskedVal);
        if (maskedVal.length === 10) {
            const parsed = parseDateFromInput(maskedVal);
            if (parsed) {
                onChange({ startDate: parsed, endDate: (endDate && parsed > endDate) ? '' : endDate });
                const [y, m, d] = parsed.split('-');
                setCurrentMonth(new Date(y, m - 1, d));
            }
        }
    };

    const handleEndInputChange = (e) => {
        const maskedVal = maskDateInput(e.target.value);
        setEndInputVal(maskedVal);
        if (maskedVal.length === 10) {
            const parsed = parseDateFromInput(maskedVal);
            if (parsed) {
                onChange({ startDate, endDate: (startDate && parsed < startDate) ? '' : parsed });
            }
        }
    };

    const isInRange = (date) => {
        const dateStr = toLocalDateString(date);
        if (startDate && endDate) {
            return dateStr > startDate && dateStr < endDate;
        }
        if (startDate && !endDate && hoverDate) {
            if (hoverDate > startDate) {
                return dateStr > startDate && dateStr < hoverDate;
            }
        }
        return false;
    };

    const getRangeClass = (date) => {
        const dateStr = toLocalDateString(date);
        if (!isInRange(date)) return '';
        let classes = ' in-range';
        const limitDate = endDate || hoverDate;
        if (startDate && dateStr === startDate) classes += ' range-start';
        if (limitDate && dateStr === limitDate) classes += ' range-end';
        return classes;
    };

    const isSelected = (date) => {
        const dateStr = toLocalDateString(date);
        if (startDate && !endDate && hoverDate && dateStr === hoverDate && hoverDate > startDate) return true;
        return dateStr === startDate || dateStr === endDate;
    };

    const days = getDaysInMonth(currentMonth);
    const monthName = currentMonth.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

    return (
        <div className="date-range-container" ref={pickerRef}>
            <div className="date-inputs-grid">
                <div className="date-input-wrapper">
                    <label className="date-label">Desde</label>
                    <div className="date-field-container">
                        <input
                            type="text"
                            className={`real-input ${isOpen && selectionPhase === 'selecting-start' ? 'active' : ''}`}
                            placeholder="dd/mm/aaaa"
                            value={startInputVal}
                            onChange={handleStartInputChange}
                            onClick={() => handleInputClick('start')}
                            maxLength="10"
                        />
                        <span className="calendar-icon">📅</span>
                    </div>
                </div>

                <div className="date-input-wrapper">
                    <label className="date-label">Hasta</label>
                    <div className="date-field-container">
                        <input
                            type="text"
                            className={`real-input ${isOpen && selectionPhase === 'selecting-end' ? 'active' : ''}`}
                            placeholder="dd/mm/aaaa"
                            value={endInputVal}
                            onChange={handleEndInputChange}
                            onClick={() => handleInputClick('end')}
                            maxLength="10"
                        />
                        <span className="calendar-icon">📅</span>
                    </div>
                </div>
            </div>

            {isOpen && (
                <div className="calendar-popup">
                    <div className="calendar-header">
                        <button type="button" className="calendar-nav-btn" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>‹</button>
                        <div className="calendar-month">{monthName}</div>
                        <button type="button" className="calendar-nav-btn" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>›</button>
                    </div>
                    <div className="calendar-grid">
                        {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map(day => (
                            <div key={day} className="calendar-day-header">{day}</div>
                        ))}
                        {days.map((dayInfo, index) => {
                            let className = 'calendar-day';
                            if (!dayInfo.isCurrentMonth) className += ' other-month';

                            const selected = isSelected(dayInfo.date);
                            if (selected) {
                                if (toLocalDateString(dayInfo.date) === startDate) className += ' selected-start';
                                else className += ' selected-end';
                            }

                            className += getRangeClass(dayInfo.date);
                            if (dayInfo.date.toDateString() === new Date().toDateString()) className += ' today';

                            return (
                                <div
                                    key={index}
                                    className={className}
                                    onClick={() => dayInfo.isCurrentMonth && handleDayClick(dayInfo.date)}
                                    onMouseEnter={() => dayInfo.isCurrentMonth && handleDayHover(dayInfo.date)}
                                >
                                    {dayInfo.day}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

export function ProgressBar({ percentage }) {
    const getColor = () => {
        if (percentage >= 100) return 'green';
        if (percentage >= 76) return 'light-green';
        if (percentage >= 41) return 'orange';
        return 'red';
    };

    const width = Math.min(percentage, 100);

    return (
        <div className="progress-container">
            <div className="progress-bar">
                <div
                    className={`progress-fill ${getColor()}`}
                    style={{ width: `${width}%` }}
                />
            </div>
        </div>
    );
}

export function SortableHeader({ label, sortKey, currentSort, onSort }) {
    const getSortIcon = () => {
        if (currentSort.key !== sortKey) return '⇅';
        if (currentSort.direction === 'asc') return '↑';
        if (currentSort.direction === 'desc') return '↓';
        return '⇅';
    };

    const isActive = currentSort.key === sortKey;

    return (
        <th onClick={() => onSort(sortKey)}>
            <div className="sortable-header">
                {label}
                <span className={`sort-icon ${isActive ? 'active' : ''}`}>
                    {getSortIcon()}
                </span>
            </div>
        </th>
    );
}

export function InlineAutocompleteInput({ label, value, onChange, suggestions, placeholder, required }) {
    const [suggestion, setSuggestion] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (value && suggestions.length > 0) {
            const match = suggestions.find(s =>
                s.toLowerCase().startsWith(value.toLowerCase())
            );
            if (match && match.toLowerCase() !== value.toLowerCase()) {
                setSuggestion(match);
            } else {
                setSuggestion('');
            }
        } else {
            setSuggestion('');
        }
    }, [value, suggestions]);

    const handleKeyDown = (e) => {
        if (e.key === 'Tab' && suggestion) {
            e.preventDefault();
            onChange(suggestion);
            setSuggestion('');
        }
    };

    return (
        <div className="form-group">
            <label className="form-label">{label}</label>
            <div className="inline-autocomplete-wrapper">
                <div className="inline-autocomplete-suggestion">
                    {suggestion}
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    className="form-input inline-autocomplete-input"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    required={required}
                />
            </div>
        </div>
    );
}
