import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import {
    DateRangePicker,
    ProgressBar,
    SortableHeader,
    InlineAutocompleteInput,
    EditableAmount,
    EditableText,
    EditableDate,
    EditableCurrency,
    EditablePaymentAmount,
    ConfirmationModal,
    formatCurrency,
    formatDate,
    toLocalDateString,
    isToday,
    isYesterday,
    isThisWeek,
    isAnterior,
    getProgressColorClass
} from './Shared';

export default function Dashboard({ session }) {
    const [reservas, setReservas] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('');
    const [selectedReserva, setSelectedReserva] = useState(null);
    const [loading, setLoading] = useState(true);

    const [filters, setFilters] = useState({
        fechaDesde: '',
        fechaHasta: '',
        busqueda: '',
        estado: 'todas',
        dateFilterType: 'salida'
    });

    const [sortConfig, setSortConfig] = useState({
        key: null,
        direction: null
    });

    useEffect(() => {
        fetchReservas();
    }, []);

    const fetchReservas = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('reservas')
                .select('*')
                .order('fechaCreacion', { ascending: false });

            if (error) {
                console.error('Error fetching reservas:', error);
            } else {
                setReservas(data || []);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const addReserva = async (reservaData) => {
        try {
            const { data, error } = await supabase
                .from('reservas')
                .insert([{
                    ...reservaData,
                    pagosCliente: [],
                    pagosProveedor: []
                }])
                .select();

            if (error) throw error;

            if (data) {
                setReservas([data[0], ...reservas]);
                setShowModal(false);
            }
        } catch (error) {
            console.error('Error adding reserva:', error);
            alert('Error al guardar la reserva: ' + error.message);
        }
    };

    const updateReserva = async (updatedReserva) => {
        try {
            const { error } = await supabase
                .from('reservas')
                .update(updatedReserva)
                .eq('id', updatedReserva.id);

            if (error) throw error;

            setReservas(reservas.map(r => r.id === updatedReserva.id ? updatedReserva : r));
            setSelectedReserva(updatedReserva);
        } catch (error) {
            console.error('Error updating reserva:', error);
            alert('Error al actualizar: ' + error.message);
        }
    };

    const deleteReserva = async (id) => {
        if (!confirm('¿Eliminar esta reserva permanentemente?')) return;

        try {
            const { error } = await supabase
                .from('reservas')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setReservas(reservas.filter(r => r.id !== id));
            setShowModal(false);
        } catch (error) {
            console.error('Error deleting reserva:', error);
            alert('Error al eliminar: ' + error.message);
        }
    };

    const toggleCheckbox = (id, field) => {
        const reserva = reservas.find(r => r.id === id);
        if (reserva) {
            updateReserva({ ...reserva, [field]: !reserva[field] });
        }
    };

    const getEstadoPagosCliente = (reserva) => {
        const totalPagado = reserva.pagosCliente?.reduce((sum, p) => sum + p.monto, 0) || 0;
        if (totalPagado >= reserva.precioVenta) return 'saldado';
        if (totalPagado > 0) return 'parcial';
        return 'pendiente';
    };

    const getEstadoPagosProveedor = (reserva) => {
        const totalPagado = reserva.pagosProveedor?.reduce((sum, p) => sum + p.monto, 0) || 0;
        if (!reserva.precioNeto) return 'saldado';
        if (totalPagado >= reserva.precioNeto) return 'saldado';
        if (totalPagado > 0) return 'parcial';
        return 'pendiente';
    };

    const isReservaCompleta = (reserva) => {
        return getEstadoPagosCliente(reserva) === 'saldado' &&
            getEstadoPagosProveedor(reserva) === 'saldado' &&
            reserva.voucherEnviado;
    };

    const getSaldoCliente = (reserva) => {
        const totalPagado = reserva.pagosCliente?.reduce((sum, p) => sum + p.monto, 0) || 0;
        return reserva.precioVenta - totalPagado;
    };

    const getSaldoProveedor = (reserva) => {
        const totalPagado = reserva.pagosProveedor?.reduce((sum, p) => sum + p.monto, 0) || 0;
        return (reserva.precioNeto || 0) - totalPagado;
    };

    const getPercentageCliente = (reserva) => {
        const totalPagado = reserva.pagosCliente?.reduce((sum, p) => sum + p.monto, 0) || 0;
        return (totalPagado / reserva.precioVenta) * 100;
    };

    const getPercentageProveedor = (reserva) => {
        const totalPagado = reserva.pagosProveedor?.reduce((sum, p) => sum + p.monto, 0) || 0;
        return reserva.precioNeto ? (totalPagado / reserva.precioNeto) * 100 : 0;
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key) {
            if (sortConfig.direction === 'asc') {
                direction = 'desc';
            } else if (sortConfig.direction === 'desc') {
                direction = null;
            }
        }
        setSortConfig({ key: direction ? key : null, direction });
    };

    const filteredReservas = useMemo(() => {
        let filtered = reservas.filter(reserva => {
            const dateToFilter = filters.dateFilterType === 'creacion' ? reserva.fechaCreacion : reserva.fechaViaje;

            if (filters.fechaDesde && dateToFilter < filters.fechaDesde) return false;
            if (filters.fechaHasta && dateToFilter > filters.fechaHasta) return false;

            if (filters.busqueda) {
                const term = filters.busqueda.toLowerCase();
                const matchNombre = reserva.titular?.toLowerCase().includes(term);
                const matchOperador = reserva.operador?.toLowerCase().includes(term);
                const matchDestino = reserva.destino?.toLowerCase().includes(term);
                if (!matchNombre && !matchOperador && !matchDestino) return false;
            }

            if (filters.estado === 'completadas' && !isReservaCompleta(reserva)) return false;
            if (filters.estado === 'pendientes' && isReservaCompleta(reserva)) return false;

            return true;
        });

        if (sortConfig.key && sortConfig.direction) {
            filtered.sort((a, b) => {
                let aVal, bVal;

                switch (sortConfig.key) {
                    case 'fechaCreacion': aVal = a.fechaCreacion; bVal = b.fechaCreacion; break;
                    case 'fechaSalida': aVal = a.fechaViaje; bVal = b.fechaViaje; break;
                    case 'nombre': aVal = a.titular.toLowerCase(); bVal = b.titular.toLowerCase(); break;
                    case 'destino': aVal = a.destino.toLowerCase(); bVal = b.destino.toLowerCase(); break;
                    case 'operador': aVal = a.operador.toLowerCase(); bVal = b.operador.toLowerCase(); break;
                    case 'saldoPax': aVal = getSaldoCliente(a); bVal = getSaldoCliente(b); break;
                    case 'saldoProv': aVal = getSaldoProveedor(a); bVal = getSaldoProveedor(b); break;
                    default: return 0;
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return filtered;
    }, [reservas, filters, sortConfig]);

    const hasActiveFilters = sortConfig.key || filters.busqueda;

    const reservasHoy = filteredReservas.filter(r => isToday(r.fechaCreacion));
    const reservasAyer = filteredReservas.filter(r => isYesterday(r.fechaCreacion));
    const reservasSemana = filteredReservas.filter(r => isThisWeek(r.fechaCreacion));
    const reservasAnteriores = filteredReservas.filter(r => isAnterior(r.fechaCreacion));

    const clearFilters = () => {
        setFilters({
            fechaDesde: '',
            fechaHasta: '',
            busqueda: '',
            estado: 'todas',
            dateFilterType: 'salida'
        });
        setSortConfig({ key: null, direction: null });
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
    };

    const exportToExcel = () => {
        const wb = XLSX.utils.book_new();

        const dataByDate = {};
        filteredReservas.forEach(r => {
            const fecha = formatDate(r.fechaViaje);
            if (!dataByDate[fecha]) dataByDate[fecha] = [];
            dataByDate[fecha].push(r);
        });

        const allDates = Object.keys(dataByDate).sort((a, b) => {
            const [dayA, monthA, yearA] = a.split('/');
            const [dayB, monthB, yearB] = b.split('/');
            return new Date(yearA, monthA - 1, dayA) - new Date(yearB, monthB - 1, dayB);
        });

        const rows = [];

        let monthTitle = '';
        if (filters.fechaDesde && filters.fechaHasta) {
            const startDate = new Date(filters.fechaDesde);
            const endDate = new Date(filters.fechaHasta);
            if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
                monthTitle = startDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }).toUpperCase();
            }
        }

        if (monthTitle) {
            rows.push([monthTitle]);
            rows.push([]);
        }

        rows.push(['FECHA', 'NOMBRE', 'DESTINO', 'OPERADOR', 'SALDO PAX', 'SALDO PROV', 'VOUCHER']);

        if (allDates.length > 0) {
            const [dayFirst, monthFirst, yearFirst] = allDates[0].split('/');
            const [dayLast, monthLast, yearLast] = allDates[allDates.length - 1].split('/');
            const firstDate = new Date(yearFirst, monthFirst - 1, dayFirst);
            const lastDate = new Date(yearLast, monthLast - 1, dayLast);

            for (let d = new Date(firstDate); d <= lastDate; d.setDate(d.getDate() + 1)) {
                const dateStr = formatDate(toLocalDateString(d));

                if (dataByDate[dateStr]) {
                    dataByDate[dateStr].forEach(reserva => {
                        const estadoCliente = getEstadoPagosCliente(reserva);
                        const estadoProveedor = getEstadoPagosProveedor(reserva);

                        rows.push([
                            dateStr,
                            reserva.titular,
                            reserva.destino,
                            reserva.operador,
                            estadoCliente === 'saldado' ? 'SALDADO' : '',
                            estadoProveedor === 'saldado' ? 'SALDADO' : '',
                            reserva.voucherEnviado ? 'ENVIADO' : ''
                        ]);
                    });
                    rows.push([]);
                } else {
                    rows.push([dateStr, '', '', '', '', '', '']);
                    rows.push([]);
                }
            }
        } else {
            // Default export if no dates
            filteredReservas.forEach(r => {
                const estadoCliente = getEstadoPagosCliente(r);
                const estadoProveedor = getEstadoPagosProveedor(r);
                rows.push([
                    formatDate(r.fechaViaje),
                    r.titular,
                    r.destino,
                    r.operador,
                    estadoCliente === 'saldado' ? 'SALDADO' : '',
                    estadoProveedor === 'saldado' ? 'SALDADO' : '',
                    r.voucherEnviado ? 'ENVIADO' : ''
                ]);
            });
        }

        const ws = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Reservas');

        const filename = monthTitle ? `Reservas_${monthTitle}.xlsx` : 'Reservas.xlsx';
        XLSX.writeFile(wb, filename);
    };

    const renderTableRows = (data) => {
        return data.map(reserva => {
            const estadoCliente = getEstadoPagosCliente(reserva);
            const estadoProveedor = getEstadoPagosProveedor(reserva);
            const completa = isReservaCompleta(reserva);
            const totalPagadoCliente = reserva.pagosCliente?.reduce((sum, p) => sum + p.monto, 0) || 0;
            const saldoCliente = reserva.precioVenta - totalPagadoCliente;
            const percentageCliente = getPercentageCliente(reserva);
            const totalPagadoProveedor = reserva.pagosProveedor?.reduce((sum, p) => sum + p.monto, 0) || 0;
            const saldoProveedor = (reserva.precioNeto || 0) - totalPagadoProveedor;
            const percentageProveedor = getPercentageProveedor(reserva);

            return (
                <tr
                    key={reserva.id}
                    className={completa ? 'completed' : ''}
                    onClick={() => {
                        setSelectedReserva(reserva);
                        setModalType('detalle');
                        setShowModal(true);
                    }}
                >
                    <td>{formatDate(reserva.fechaCreacion)}</td>
                    <td>{formatDate(reserva.fechaViaje)}</td>
                    <td style={{ fontWeight: 600 }}>{reserva.titular}</td>
                    <td>{reserva.destino}</td>
                    <td>{reserva.operador}</td>
                    <td>
                        <div>
                            <span className={`status-badge ${estadoCliente}`}>
                                {estadoCliente === 'saldado' ? (
                                    <>✓ Saldado {percentageCliente > 100 && '⚠️'}</>
                                ) : (
                                    formatCurrency(saldoCliente, reserva.moneda)
                                )}
                            </span>
                            <ProgressBar percentage={percentageCliente} />
                        </div>
                    </td>
                    <td className="checkbox-cell" onClick={(e) => e.stopPropagation()}>
                        <input
                            type="checkbox"
                            className="checkbox"
                            checked={reserva.liquidacionRecibida || false}
                            onChange={() => toggleCheckbox(reserva.id, 'liquidacionRecibida')}
                        />
                    </td>
                    <td>
                        <div>
                            <span className={`status-badge ${estadoProveedor}`}>
                                {estadoProveedor === 'saldado' ? (
                                    <>✓ Saldado {percentageProveedor > 100 && '⚠️'}</>
                                ) : (
                                    formatCurrency(saldoProveedor, reserva.moneda)
                                )}
                            </span>
                            <ProgressBar percentage={percentageProveedor} />
                        </div>
                    </td>
                    <td className="checkbox-cell" onClick={(e) => e.stopPropagation()}>
                        <input
                            type="checkbox"
                            className="checkbox"
                            checked={reserva.voucherEnviado || false}
                            onChange={() => toggleCheckbox(reserva.id, 'voucherEnviado')}
                        />
                    </td>
                </tr>
            );
        });
    };

    return (
        <div className="app">
            <div className="header">
                <div>
                    <h1>📋 Sistema de Reservas</h1>
                    <div className="text-sm text-gray-500 mt-1">
                        Usuario: {session.user.email}
                    </div>
                </div>

                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={handleSignOut}>
                        Cerrar Sesión
                    </button>
                    <button className="btn btn-success" onClick={exportToExcel}>
                        📊 Exportar
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            setModalType('nueva');
                            setSelectedReserva(null);
                            setShowModal(true);
                        }}
                    >
                        + Nueva
                    </button>
                </div>
            </div>

            <div className="filters">
                <div className="filters-grid">
                    <div className="filter-group">
                        <DateRangePicker
                            startDate={filters.fechaDesde}
                            endDate={filters.fechaHasta}
                            onChange={({ startDate, endDate }) => setFilters({ ...filters, fechaDesde: startDate, fechaHasta: endDate })}
                        />
                        <div className="date-filter-toggle">
                            <span className={`currency-label ${filters.dateFilterType === 'creacion' ? 'active' : 'inactive'}`}>
                                Fc. Creación
                            </span>
                            <label className="switch">
                                <input
                                    type="checkbox"
                                    checked={filters.dateFilterType === 'salida'}
                                    onChange={(e) => setFilters({ ...filters, dateFilterType: e.target.checked ? 'salida' : 'creacion' })}
                                />
                                <span className="slider"></span>
                            </label>
                            <span className={`currency-label ${filters.dateFilterType === 'salida' ? 'active' : 'inactive'}`}>
                                Fc. Salida
                            </span>
                        </div>
                    </div>
                    <div className="filter-group">
                        <label className="filter-label">Búsqueda</label>
                        <input
                            type="text"
                            className="filter-input"
                            placeholder="Nombre, operador o destino..."
                            value={filters.busqueda}
                            onChange={(e) => setFilters({ ...filters, busqueda: e.target.value })}
                        />
                    </div>
                    <div className="filter-group">
                        <label className="filter-label">Estado</label>
                        <select
                            className="filter-input"
                            value={filters.estado}
                            onChange={(e) => setFilters({ ...filters, estado: e.target.value })}
                        >
                            <option value="todas">Todas</option>
                            <option value="pendientes">Pendientes</option>
                            <option value="completadas">Completadas</option>
                        </select>
                    </div>
                    <div style={{ paddingBottom: '3px' }}>
                        <button className="btn btn-clear" onClick={clearFilters} style={{ width: '100%' }}>
                            Limpiar
                        </button>
                    </div>
                </div>
            </div>

            <div className="table-container">
                <div className="table-wrapper">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Cargando reservas...</div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <SortableHeader label="CREACIÓN" sortKey="fechaCreacion" currentSort={sortConfig} onSort={handleSort} />
                                    <SortableHeader label="SALIDA" sortKey="fechaSalida" currentSort={sortConfig} onSort={handleSort} />
                                    <SortableHeader label="NOMBRE" sortKey="nombre" currentSort={sortConfig} onSort={handleSort} />
                                    <SortableHeader label="DESTINO" sortKey="destino" currentSort={sortConfig} onSort={handleSort} />
                                    <SortableHeader label="OPERADOR" sortKey="operador" currentSort={sortConfig} onSort={handleSort} />
                                    <SortableHeader label="SALDO PAX" sortKey="saldoPax" currentSort={sortConfig} onSort={handleSort} />
                                    <th>LIQ.</th>
                                    <SortableHeader label="SALDO PROV" sortKey="saldoProv" currentSort={sortConfig} onSort={handleSort} />
                                    <th>VOUCH.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {hasActiveFilters ? (
                                    filteredReservas.length > 0 ? (
                                        renderTableRows(filteredReservas)
                                    ) : (
                                        <tr>
                                            <td colSpan="9">
                                                <div className="empty-state">
                                                    <p>No hay reservas que coincidan con los filtros</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                ) : (
                                    <>
                                        {reservasHoy.length > 0 && (
                                            <>
                                                <tr style={{ background: '#f9fafb' }}>
                                                    <td colSpan="9" style={{ padding: '0.75rem 1.5rem', fontWeight: 700, fontSize: '1rem', color: '#374151', borderLeft: '4px solid #3b82f6' }}>
                                                        🔥 HOY
                                                    </td>
                                                </tr>
                                                {renderTableRows(reservasHoy)}
                                            </>
                                        )}
                                        {reservasAyer.length > 0 && (
                                            <>
                                                <tr style={{ background: '#f9fafb' }}>
                                                    <td colSpan="9" style={{ padding: '0.75rem 1.5rem', fontWeight: 700, fontSize: '1rem', color: '#374151', borderLeft: '4px solid #3b82f6' }}>
                                                        📅 AYER
                                                    </td>
                                                </tr>
                                                {renderTableRows(reservasAyer)}
                                            </>
                                        )}
                                        {reservasSemana.length > 0 && (
                                            <>
                                                <tr style={{ background: '#f9fafb' }}>
                                                    <td colSpan="9" style={{ padding: '0.75rem 1.5rem', fontWeight: 700, fontSize: '1rem', color: '#374151', borderLeft: '4px solid #3b82f6' }}>
                                                        📆 EN LA SEMANA
                                                    </td>
                                                </tr>
                                                {renderTableRows(reservasSemana)}
                                            </>
                                        )}
                                        {reservasAnteriores.length > 0 && (
                                            <>
                                                <tr style={{ background: '#f9fafb' }}>
                                                    <td colSpan="9" style={{ padding: '0.75rem 1.5rem', fontWeight: 700, fontSize: '1rem', color: '#374151', borderLeft: '4px solid #3b82f6' }}>
                                                        📦 ANTERIORES
                                                    </td>
                                                </tr>
                                                {renderTableRows(reservasAnteriores)}
                                            </>
                                        )}
                                        {reservasHoy.length === 0 && reservasAyer.length === 0 && reservasSemana.length === 0 && reservasAnteriores.length === 0 && (
                                            <tr>
                                                <td colSpan="9">
                                                    <div className="empty-state">
                                                        <p>No hay reservas registradas</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        {modalType === 'detalle' ? (
                            <ReservaDetalle
                                reserva={selectedReserva}
                                onUpdate={updateReserva}
                                onDelete={deleteReserva}
                                onClose={() => setShowModal(false)}
                            />
                        ) : (
                            <ReservaForm
                                reservas={reservas}
                                onSave={addReserva}
                                onClose={() => setShowModal(false)}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function ReservaForm({ reservas, onSave, onClose }) {
    const [formData, setFormData] = useState({
        fechaCreacion: toLocalDateString(new Date()),
        fechaViaje: '',
        fechaRegreso: '',
        titular: '',
        destino: '',
        operador: '',
        precioVenta: '',
        precioNeto: '',
        moneda: 'ARS',
        liquidacionRecibida: false,
        voucherEnviado: false
    });

    const destinosSuggestions = useMemo(() => {
        const destinos = reservas.map(r => r.destino).filter(Boolean);
        return [...new Set(destinos)];
    }, [reservas]);

    const operadoresSuggestions = useMemo(() => {
        const operadores = reservas.map(r => r.operador).filter(Boolean);
        return [...new Set(operadores)];
    }, [reservas]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.fechaViaje || !formData.titular || !formData.destino || !formData.operador || !formData.precioVenta) {
            alert('Complete los campos obligatorios');
            return;
        }
        onSave({
            ...formData,
            precioVenta: parseFloat(formData.precioVenta),
            precioNeto: parseFloat(formData.precioNeto || 0)
        });
    };

    return (
        <>
            <div className="modal-header">
                <h2 className="modal-title">Nueva Reserva</h2>
                <button className="modal-close" onClick={onClose}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
                <div className="modal-body">
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Fecha de Creación</label>
                            <input
                                type="date"
                                className="form-input"
                                value={formData.fechaCreacion}
                                onChange={(e) => setFormData({ ...formData, fechaCreacion: e.target.value })}
                            />
                        </div>
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <DateRangePicker
                                startDate={formData.fechaViaje}
                                endDate={formData.fechaRegreso}
                                onChange={({ startDate, endDate }) => setFormData({ ...formData, fechaViaje: startDate, fechaRegreso: endDate })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Titular de la Reserva *</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.titular}
                                onChange={(e) => setFormData({ ...formData, titular: e.target.value })}
                                required
                            />
                        </div>
                        <InlineAutocompleteInput
                            label="Destino *"
                            value={formData.destino}
                            onChange={(value) => setFormData({ ...formData, destino: value })}
                            suggestions={destinosSuggestions}
                            placeholder="Ingrese el destino"
                            required
                        />
                        <InlineAutocompleteInput
                            label="Operador *"
                            value={formData.operador}
                            onChange={(value) => setFormData({ ...formData, operador: value })}
                            suggestions={operadoresSuggestions}
                            placeholder="Ingrese el operador"
                            required
                        />

                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label className="form-label">Moneda</label>
                            <div className="currency-switch">
                                <span className={`currency-label ${formData.moneda === 'ARS' ? 'active' : 'inactive'}`}>
                                    $ ARS
                                </span>
                                <label className="switch">
                                    <input
                                        type="checkbox"
                                        checked={formData.moneda === 'USD'}
                                        onChange={(e) => setFormData({ ...formData, moneda: e.target.checked ? 'USD' : 'ARS' })}
                                    />
                                    <span className="slider"></span>
                                </label>
                                <span className={`currency-label ${formData.moneda === 'USD' ? 'active' : 'inactive'}`}>
                                    USD
                                </span>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Precio de Venta Total *</label>
                            <input
                                type="number"
                                className="form-input"
                                min="0"
                                step="0.01"
                                value={formData.precioVenta}
                                onChange={(e) => setFormData({ ...formData, precioVenta: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Precio Neto (Operador)</label>
                            <input
                                type="number"
                                className="form-input"
                                min="0"
                                step="0.01"
                                value={formData.precioNeto}
                                onChange={(e) => setFormData({ ...formData, precioNeto: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ visibility: 'hidden' }}>Opciones</label>
                            <div className="form-checkbox-group">
                                <input
                                    type="checkbox"
                                    checked={formData.liquidacionRecibida}
                                    onChange={(e) => setFormData({ ...formData, liquidacionRecibida: e.target.checked })}
                                />
                                <label>Liquidación recibida</label>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ visibility: 'hidden' }}>Opciones</label>
                            <div className="form-checkbox-group">
                                <input
                                    type="checkbox"
                                    checked={formData.voucherEnviado}
                                    onChange={(e) => setFormData({ ...formData, voucherEnviado: e.target.checked })}
                                />
                                <label>Voucher enviado</label>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        Cancelar
                    </button>
                    <button type="submit" className="btn btn-primary">
                        Crear Reserva
                    </button>
                </div>
            </form>
        </>
    );
}

function ReservaDetalle({ reserva, onUpdate, onDelete, onClose }) {
    const [showPagoForm, setShowPagoForm] = useState(false);
    const [showSalidaForm, setShowSalidaForm] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: '', id: null });

    const pagosCliente = Array.isArray(reserva.pagosCliente) ? reserva.pagosCliente : [];
    const pagosProveedor = Array.isArray(reserva.pagosProveedor) ? reserva.pagosProveedor : [];

    const totalPagadoCliente = pagosCliente.reduce((sum, p) => sum + p.monto, 0);
    const saldoCliente = reserva.precioVenta - totalPagadoCliente;
    const porcentajeCliente = (totalPagadoCliente / reserva.precioVenta) * 100;

    const totalPagadoProveedor = pagosProveedor.reduce((sum, p) => sum + p.monto, 0);
    const saldoProveedor = (reserva.precioNeto || 0) - totalPagadoProveedor;
    const porcentajeProveedor = reserva.precioNeto ? (totalPagadoProveedor / reserva.precioNeto) * 100 : 0;

    const addPago = (fecha, metodo, monto) => {
        const updatedReserva = {
            ...reserva,
            pagosCliente: [...pagosCliente, {
                id: Date.now(),
                fecha,
                metodo,
                monto: parseFloat(monto)
            }]
        };
        onUpdate(updatedReserva);
        setShowPagoForm(false);
    };

    const addSalida = (fecha, metodo, monto) => {
        const updatedReserva = {
            ...reserva,
            pagosProveedor: [...pagosProveedor, {
                id: Date.now(),
                fecha,
                metodo,
                monto: parseFloat(monto)
            }]
        };
        onUpdate(updatedReserva);
        setShowSalidaForm(false);
    };

    const updateField = (field, newVal) => {
        onUpdate({ ...reserva, [field]: newVal });
    };

    const updatePaymentAmount = (pagoId, newAmount, type) => {
        if (type === 'cliente') {
            const updatedPagos = pagosCliente.map(p =>
                p.id === pagoId ? { ...p, monto: newAmount } : p
            );
            onUpdate({ ...reserva, pagosCliente: updatedPagos });
        } else {
            const updatedPagos = pagosProveedor.map(p =>
                p.id === pagoId ? { ...p, monto: newAmount } : p
            );
            onUpdate({ ...reserva, pagosProveedor: updatedPagos });
        }
    };

    const confirmDeletePago = (id) => {
        setConfirmModal({ isOpen: true, type: 'pago', id });
    };

    const confirmDeleteSalida = (id) => {
        setConfirmModal({ isOpen: true, type: 'salida', id });
    };

    const executeDelete = () => {
        if (confirmModal.type === 'pago') {
            const updatedReserva = {
                ...reserva,
                pagosCliente: pagosCliente.filter(p => p.id !== confirmModal.id)
            };
            onUpdate(updatedReserva);
        } else if (confirmModal.type === 'salida') {
            const updatedReserva = {
                ...reserva,
                pagosProveedor: pagosProveedor.filter(p => p.id !== confirmModal.id)
            };
            onUpdate(updatedReserva);
        }
        setConfirmModal({ isOpen: false, type: '', id: null });
    };

    const clienteColorClass = getProgressColorClass(porcentajeCliente);
    const proveedorColorClass = getProgressColorClass(porcentajeProveedor);

    return (
        <>
            <div className="modal-header">
                <h2 className="modal-title">Detalle de Reserva</h2>
                <button className="modal-close" onClick={onClose}>×</button>
            </div>
            <div className="modal-body">
                <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1rem' }}>
                        {reserva.destino}
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.9rem' }}>
                        <EditableText
                            value={reserva.titular}
                            onSave={(val) => updateField('titular', val)}
                            label="Titular"
                        />
                        <EditableDate
                            value={reserva.fechaCreacion}
                            onSave={(val) => updateField('fechaCreacion', val)}
                            label="Fecha Creación"
                        />
                        <EditableDate
                            value={reserva.fechaViaje}
                            onSave={(val) => updateField('fechaViaje', val)}
                            label="Fecha Viaje"
                        />
                        {reserva.fechaRegreso && (
                            <EditableDate
                                value={reserva.fechaRegreso}
                                onSave={(val) => updateField('fechaRegreso', val)}
                                label="Fecha Regreso"
                            />
                        )}
                        <EditableText
                            value={reserva.destino}
                            onSave={(val) => updateField('destino', val)}
                            label="Destino"
                        />
                        <EditableText
                            value={reserva.operador}
                            onSave={(val) => updateField('operador', val)}
                            label="Operador"
                        />
                        <EditableCurrency
                            value={reserva.moneda}
                            onSave={(val) => updateField('moneda', val)}
                        />
                    </div>
                </div>

                <div className="resumen-financiero">
                    <div className="resumen-item">
                        <div className="resumen-label">Precio Venta Total</div>
                        <EditableAmount
                            value={reserva.precioVenta}
                            currency={reserva.moneda}
                            onSave={(val) => updateField('precioVenta', val)}
                        />
                    </div>
                    <div className="resumen-item">
                        <div className="resumen-label">Abonado Cliente</div>
                        <div className={`resumen-value ${clienteColorClass}`}>{formatCurrency(totalPagadoCliente, reserva.moneda)}</div>
                        <div className={`resumen-subtext ${clienteColorClass}`}>
                            {Math.round(porcentajeCliente)}%
                        </div>
                    </div>
                    <div className="resumen-item">
                        <div className="resumen-label">Saldo Cliente</div>
                        <div className={`resumen-value ${saldoCliente > 0 ? 'money-negative' : 'money-positive'}`}>
                            {formatCurrency(saldoCliente, reserva.moneda)}
                        </div>
                    </div>

                    <div className="resumen-separator"></div>

                    <div className="resumen-item">
                        <div className="resumen-label">Precio Neto</div>
                        <EditableAmount
                            value={reserva.precioNeto || 0}
                            currency={reserva.moneda}
                            onSave={(val) => updateField('precioNeto', val)}
                        />
                    </div>
                    <div className="resumen-item">
                        <div className="resumen-label">Abonado Operador</div>
                        <div className={`resumen-value ${proveedorColorClass}`}>{formatCurrency(totalPagadoProveedor, reserva.moneda)}</div>
                        <div className={`resumen-subtext ${proveedorColorClass}`}>
                            {Math.round(porcentajeProveedor)}%
                        </div>
                    </div>
                    <div className="resumen-item">
                        <div className="resumen-label">Saldo Operador</div>
                        <div className={`resumen-value ${saldoProveedor > 0 ? 'money-negative' : 'money-positive'}`}>
                            {formatCurrency(saldoProveedor, reserva.moneda)}
                        </div>
                    </div>
                </div>

                <h3 className="section-title">Pagos de Cliente</h3>

                {showPagoForm ? (
                    <PagoQuickForm
                        onSave={addPago}
                        onCancel={() => setShowPagoForm(false)}
                        moneda={reserva.moneda}
                    />
                ) : (
                    <button
                        className="btn btn-success btn-small"
                        onClick={() => setShowPagoForm(true)}
                        style={{ marginBottom: '1rem' }}
                    >
                        + Registrar Pago
                    </button>
                )}

                <div className="pagos-list">
                    {pagosCliente && pagosCliente.length > 0 ? (
                        pagosCliente.map(pago => (
                            <div key={pago.id} className="pago-item">
                                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                                    {formatDate(pago.fecha)}
                                </div>
                                <div>
                                    <span style={{
                                        padding: '0.2rem 0.6rem',
                                        background: '#d1fae5',
                                        color: '#065f46',
                                        borderRadius: '4px',
                                        fontSize: '0.8rem',
                                        fontWeight: 600
                                    }}>
                                        {pago.metodo}
                                    </span>
                                </div>
                                <div style={{ color: '#10b981' }}>
                                    <EditablePaymentAmount
                                        value={pago.monto}
                                        currency={reserva.moneda}
                                        onSave={(newAmount) => updatePaymentAmount(pago.id, newAmount, 'cliente')}
                                    />
                                </div>
                                <button
                                    className="btn btn-secondary btn-small"
                                    onClick={() => confirmDeletePago(pago.id)}
                                >
                                    Eliminar
                                </button>
                            </div>
                        ))
                    ) : (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                            No hay pagos registrados
                        </div>
                    )}
                </div>

                <h3 className="section-title">Pagos a Operador</h3>

                {showSalidaForm ? (
                    <SalidaQuickForm
                        onSave={addSalida}
                        onCancel={() => setShowSalidaForm(false)}
                        moneda={reserva.moneda}
                    />
                ) : (
                    <button
                        className="btn btn-success btn-small"
                        onClick={() => setShowSalidaForm(true)}
                        style={{ marginBottom: '1rem' }}
                    >
                        + Registrar Pago
                    </button>
                )}

                <div className="pagos-list">
                    {pagosProveedor && pagosProveedor.length > 0 ? (
                        pagosProveedor.map(pago => (
                            <div key={pago.id} className="pago-item salida-item">
                                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                                    {formatDate(pago.fecha)}
                                </div>
                                <div>
                                    <span style={{
                                        padding: '0.2rem 0.6rem',
                                        background: '#fee2e2',
                                        color: '#991b1b',
                                        borderRadius: '4px',
                                        fontSize: '0.8rem',
                                        fontWeight: 600
                                    }}>
                                        {pago.metodo}
                                    </span>
                                </div>
                                <div style={{ color: '#ef4444' }}>
                                    <EditablePaymentAmount
                                        value={pago.monto}
                                        currency={reserva.moneda}
                                        onSave={(newAmount) => updatePaymentAmount(pago.id, newAmount, 'proveedor')}
                                    />
                                </div>
                                <button
                                    className="btn btn-secondary btn-small"
                                    onClick={() => confirmDeleteSalida(pago.id)}
                                >
                                    Eliminar
                                </button>
                            </div>
                        ))
                    ) : (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                            No hay pagos registrados
                        </div>
                    )}
                </div>
            </div>
            <div className="modal-footer">
                <button
                    className="btn btn-secondary"
                    onClick={() => onDelete(reserva.id)}
                >
                    Eliminar Reserva
                </button>
                <button className="btn btn-primary" onClick={onClose}>
                    Cerrar
                </button>
            </div>

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                message="¿Estás seguro de que deseas eliminar este pago? Esta acción no se puede deshacer."
                onConfirm={executeDelete}
                onCancel={() => setConfirmModal({ isOpen: false, type: '', id: null })}
            />
        </>
    );
}

function PagoQuickForm({ onSave, onCancel, moneda }) {
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [metodo, setMetodo] = useState('Efectivo');
    const [monto, setMonto] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!monto) {
            alert('Ingrese el monto');
            return;
        }
        onSave(fecha, metodo, monto);
        setFecha(new Date().toISOString().split('T')[0]);
        setMetodo('Efectivo');
        setMonto('');
    };

    return (
        <form onSubmit={handleSubmit} className="add-pago-form">
            <input
                type="date"
                className="form-input"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
            />
            <select
                className="form-select"
                value={metodo}
                onChange={(e) => setMetodo(e.target.value)}
            >
                <option value="Efectivo">Efectivo</option>
                <option value="Tarjeta">Tarjeta</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Depósito">Depósito</option>
            </select>
            <input
                type="number"
                className="form-input"
                placeholder={`Monto en ${moneda === 'USD' ? 'USD' : 'ARS'}`}
                min="0"
                step="0.01"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                required
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn btn-success btn-small">
                    Guardar
                </button>
                <button type="button" className="btn btn-secondary btn-small" onClick={onCancel}>
                    Cancelar
                </button>
            </div>
        </form>
    );
}

function SalidaQuickForm({ onSave, onCancel, moneda }) {
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [metodo, setMetodo] = useState('Transferencia');
    const [monto, setMonto] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!monto) {
            alert('Ingrese el monto');
            return;
        }
        onSave(fecha, metodo, monto);
        setFecha(new Date().toISOString().split('T')[0]);
        setMetodo('Transferencia');
        setMonto('');
    };

    return (
        <form onSubmit={handleSubmit} className="add-pago-form add-salida-form">
            <input
                type="date"
                className="form-input"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
            />
            <select
                className="form-select"
                value={metodo}
                onChange={(e) => setMetodo(e.target.value)}
            >
                <option value="Efectivo">Efectivo</option>
                <option value="Tarjeta">Tarjeta</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Depósito">Depósito</option>
            </select>
            <input
                type="number"
                className="form-input"
                placeholder={`Monto en ${moneda === 'USD' ? 'USD' : 'ARS'}`}
                min="0"
                step="0.01"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                required
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn btn-success btn-small">
                    Guardar
                </button>
                <button type="button" className="btn btn-secondary btn-small" onClick={onCancel}>
                    Cancelar
                </button>
            </div>
        </form>
    );
}
