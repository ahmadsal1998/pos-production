import React, { useState, useMemo, useEffect } from 'react';
import { PurchaseOrder, ChequeDetails, ChequeStatus } from '../types';
import { AR_LABELS, UUID, SearchIcon, GridViewIcon, TableViewIcon, ClockIcon, ChequesIcon, XIcon, CheckCircleIcon, EditIcon } from '../constants';
import MetricCard from './MetricCard';

// Replicating mock data locally as we can't import from other components
const MOCK_SUPPLIERS_DATA = [
    { id: 'supp-1', name: 'شركة المواد الغذائية المتحدة', phone: '0112345678' },
    { id: 'supp-2', name: 'موردو الإلكترونيات الحديثة', phone: '0128765432' },
    { id: 'supp-3', name: 'شركة المشروبات العالمية', phone: '0134567890' },
];

const createInitialPurchases = (): PurchaseOrder[] => [
    { id: `PO-001`, supplierId: 'supp-1', supplierName: MOCK_SUPPLIERS_DATA[0].name, items: [], subtotal: 4500, tax: 15, discount: 0, totalAmount: 5175, status: 'Completed', purchaseDate: '2024-07-15T10:00:00Z', paymentMethod: 'Bank Transfer' },
    { id: `PO-002`, supplierId: 'supp-2', supplierName: MOCK_SUPPLIERS_DATA[1].name, items: [], subtotal: 42000, tax: 15, discount: 1000, totalAmount: 47150, status: 'Pending', purchaseDate: '2024-07-20T14:30:00Z', paymentMethod: 'Credit' },
    { id: `PO-003`, supplierId: 'supp-3', supplierName: MOCK_SUPPLIERS_DATA[2].name, items: [], subtotal: 2400, tax: 15, discount: 0, totalAmount: 2760, status: 'Pending', purchaseDate: new Date(Date.now() - 5 * 24*60*60*1000).toISOString(), paymentMethod: 'Cheque', chequeDetails: { chequeAmount: 2760, chequeDueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), chequeNumber: '10025', bankName: 'بنك الراجحي', status: 'Pending' } },
    { id: `PO-004`, supplierId: 'supp-1', supplierName: MOCK_SUPPLIERS_DATA[0].name, items: [], subtotal: 8000, tax: 15, discount: 200, totalAmount: 9000, status: 'Completed', purchaseDate: new Date(Date.now() - 10 * 24*60*60*1000).toISOString(), paymentMethod: 'Cheque', chequeDetails: { chequeAmount: 9000, chequeDueDate: new Date(Date.now() - 1 * 24*60*60*1000).toISOString(), chequeNumber: '10026', bankName: 'بنك الأهلي', status: 'Cleared' } },
    { id: `PO-005`, supplierId: 'supp-2', supplierName: MOCK_SUPPLIERS_DATA[1].name, items: [], subtotal: 1500, tax: 15, discount: 0, totalAmount: 1725, status: 'Pending', purchaseDate: new Date(Date.now() - 20 * 24*60*60*1000).toISOString(), paymentMethod: 'Cheque', chequeDetails: { chequeAmount: 1725, chequeDueDate: new Date(Date.now() - 2 * 24*60*60*1000).toISOString(), chequeNumber: '10027', bankName: 'بنك الرياض', status: 'Bounced' } },
    { id: `PO-006`, supplierId: 'supp-3', supplierName: MOCK_SUPPLIERS_DATA[2].name, items: [], subtotal: 300, tax: 15, discount: 0, totalAmount: 345, status: 'Pending', purchaseDate: new Date().toISOString(), paymentMethod: 'Cheque', chequeDetails: { chequeAmount: 345, chequeDueDate: new Date().toISOString(), chequeNumber: '10028', bankName: 'بنك الراجحي', status: 'Pending' } },

];
// --- END MOCK DATA ---

interface Cheque extends ChequeDetails {
  id: string; // Using purchase ID as unique cheque ID for this mock
  purchaseId: string;
  supplierName: string;
}

const CHEQUE_STATUS_STYLES: Record<ChequeStatus, { bg: string, text: string, label: string }> = {
    'Pending': { bg: 'bg-blue-100 dark:bg-blue-900/50', text: 'text-blue-800 dark:text-blue-300', label: AR_LABELS.pending },
    'Cleared': { bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-800 dark:text-green-300', label: AR_LABELS.cleared },
    'Bounced': { bg: 'bg-red-100 dark:bg-red-900/50', text: 'text-red-800 dark:text-red-300', label: AR_LABELS.bounced },
};

const ChequeDetailsModal: React.FC<{
    cheque: Cheque | null;
    onClose: () => void;
    onStatusChange: (chequeId: string, newStatus: ChequeStatus) => void;
}> = ({ cheque, onClose, onStatusChange }) => {
    if (!cheque) return null;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md text-right" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">{AR_LABELS.chequeDetails}</h2>
                <div className="space-y-2 text-sm">
                    <p><strong>{AR_LABELS.chequeNumberShort}:</strong> {cheque.chequeNumber || 'N/A'}</p>
                    <p><strong>{AR_LABELS.supplier}:</strong> {cheque.supplierName}</p>
                    <p><strong>{AR_LABELS.amount}:</strong> <span className="font-bold text-lg text-orange-600">{cheque.chequeAmount.toLocaleString('ar-SA', {style: 'currency', currency: 'SAR'})}</span></p>
                    <p><strong>{AR_LABELS.bankName}:</strong> {cheque.bankName || 'N/A'}</p>
                    <p><strong>{AR_LABELS.dueDate}:</strong> {new Date(cheque.chequeDueDate).toLocaleDateString('ar-SA')}</p>
                    <p><strong>{AR_LABELS.status}:</strong> <span className={`px-2 py-1 text-xs font-semibold rounded-full ${CHEQUE_STATUS_STYLES[cheque.status].bg} ${CHEQUE_STATUS_STYLES[cheque.status].text}`}>{CHEQUE_STATUS_STYLES[cheque.status].label}</span></p>
                </div>
                <div className="mt-4 pt-4 border-t dark:border-gray-700">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{AR_LABELS.changeStatus}</label>
                    <div className="flex justify-end gap-2">
                        {Object.keys(CHEQUE_STATUS_STYLES).map(status => (
                            <button key={status} onClick={() => onStatusChange(cheque.id, status as ChequeStatus)} className={`px-3 py-1 text-sm rounded-md ${CHEQUE_STATUS_STYLES[status as ChequeStatus].bg} ${CHEQUE_STATUS_STYLES[status as ChequeStatus].text}`}>{CHEQUE_STATUS_STYLES[status as ChequeStatus].label}</button>
                        ))}
                    </div>
                </div>
                <button onClick={onClose} className="mt-6 w-full px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">{AR_LABELS.cancel}</button>
            </div>
        </div>
    );
};

const ChequesPage: React.FC = () => {
    const [cheques, setCheques] = useState<Cheque[]>([]);
    const [view, setView] = useState<'list' | 'calendar'>('list');
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ status: 'all', date: 'all' });
    const [modalCheque, setModalCheque] = useState<Cheque | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        const allCheques = createInitialPurchases()
            .filter(p => p.paymentMethod === 'Cheque' && p.chequeDetails)
            .map(p => ({
                ...p.chequeDetails!,
                id: p.id,
                purchaseId: p.id,
                supplierName: p.supplierName,
            }));
        setCheques(allCheques);
    }, []);

    const summaryMetrics = useMemo(() => {
        const today = new Date().setHours(0, 0, 0, 0);
        const pending = cheques.filter(c => c.status === 'Pending');
        const overdue = pending.filter(c => new Date(c.chequeDueDate).setHours(0, 0, 0, 0) < today);
        const bounced = cheques.filter(c => c.status === 'Bounced');
        const cleared = cheques.filter(c => c.status === 'Cleared');
        
        return {
            pending: { count: pending.length, total: pending.reduce((s, c) => s + c.chequeAmount, 0) },
            overdue: { count: overdue.length, total: overdue.reduce((s, c) => s + c.chequeAmount, 0) },
            bounced: { count: bounced.length, total: bounced.reduce((s, c) => s + c.chequeAmount, 0) },
            cleared: { count: cleared.length, total: cleared.reduce((s, c) => s + c.chequeAmount, 0) },
        };
    }, [cheques]);

    const filteredCheques = useMemo(() => {
        const today = new Date();
        const todayStart = new Date().setHours(0, 0, 0, 0);

        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        return cheques.filter(c => {
            const lowerSearch = searchTerm.toLowerCase();
            const matchesSearch = searchTerm ? (c.chequeNumber || '').toLowerCase().includes(lowerSearch) || c.supplierName.toLowerCase().includes(lowerSearch) : true;
            
            const matchesStatus = filters.status !== 'all' ? c.status === filters.status : true;

            const dueDate = new Date(c.chequeDueDate);
            let matchesDate = true;
            if (filters.date === 'today') {
                matchesDate = dueDate.toDateString() === today.toDateString();
            } else if (filters.date === 'this_week') {
                matchesDate = dueDate >= startOfWeek && dueDate <= endOfWeek;
            } else if (filters.date === 'overdue') {
                matchesDate = dueDate.setHours(0,0,0,0) < todayStart && c.status === 'Pending';
            }
            
            return matchesSearch && matchesStatus && matchesDate;
        }).sort((a,b) => new Date(a.chequeDueDate).getTime() - new Date(b.chequeDueDate).getTime());
    }, [cheques, searchTerm, filters]);


    const handleStatusChange = (chequeId: string, newStatus: ChequeStatus) => {
        setCheques(prev => prev.map(c => c.id === chequeId ? { ...c, status: newStatus } : c));
        setModalCheque(prev => prev && prev.id === chequeId ? {...prev, status: newStatus} : prev);
    };

    const changeMonth = (delta: number) => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
    };

    const calendarData = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        const paddingDays = Array.from({ length: firstDayOfMonth }, (_, i) => null);
        const calendarGrid = [...paddingDays, ...days];
        
        const chequesByDate: Record<number, Cheque[]> = {};
        filteredCheques.forEach(cheque => {
            const dueDate = new Date(cheque.chequeDueDate);
            if (dueDate.getFullYear() === year && dueDate.getMonth() === month) {
                const day = dueDate.getDate();
                if (!chequesByDate[day]) chequesByDate[day] = [];
                chequesByDate[day].push(cheque);
            }
        });

        return { calendarGrid, chequesByDate };
    }, [currentDate, filteredCheques]);


    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{AR_LABELS.chequeManagement}</h1>
                <p className="text-gray-600 dark:text-gray-400">{AR_LABELS.chequeManagementDescription}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard id={1} title={AR_LABELS.totalPending} value={summaryMetrics.pending.total.toLocaleString('ar-SA', {style: 'currency', currency: 'SAR'})} icon={<ChequesIcon />} bgColor="bg-blue-100" valueColor="text-blue-600" />
                <MetricCard id={2} title={AR_LABELS.totalOverdue} value={summaryMetrics.overdue.total.toLocaleString('ar-SA', {style: 'currency', currency: 'SAR'})} icon={<ClockIcon />} bgColor="bg-yellow-100" valueColor="text-yellow-600" />
                <MetricCard id={3} title={AR_LABELS.totalBounced} value={summaryMetrics.bounced.total.toLocaleString('ar-SA', {style: 'currency', currency: 'SAR'})} icon={<XIcon className="h-6 w-6"/>} bgColor="bg-red-100" valueColor="text-red-600" />
                <MetricCard id={4} title={AR_LABELS.totalCleared} value={summaryMetrics.cleared.total.toLocaleString('ar-SA', {style: 'currency', currency: 'SAR'})} icon={<CheckCircleIcon className="h-6 w-6"/>} bgColor="bg-green-100" valueColor="text-green-600" />
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-center">
                    <div className="relative lg:col-span-2">
                        <input type="text" placeholder={AR_LABELS.searchByChequeOrSupplier} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-3 pr-10 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:ring-orange-500 text-right"/>
                        <SearchIcon className="absolute top-1/2 left-3 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    </div>
                    <select name="status" value={filters.status} onChange={e => setFilters(f => ({...f, status: e.target.value}))} className="w-full p-2 border rounded-md text-right border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200">
                        <option value="all">{AR_LABELS.allStatuses}</option>
                        <option value="Pending">{AR_LABELS.pending}</option>
                        <option value="Cleared">{AR_LABELS.cleared}</option>
                        <option value="Bounced">{AR_LABELS.bounced}</option>
                    </select>
                    <select name="date" value={filters.date} onChange={e => setFilters(f => ({...f, date: e.target.value}))} className="w-full p-2 border rounded-md text-right border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200">
                        <option value="all">{AR_LABELS.allDates}</option>
                        <option value="today">{AR_LABELS.dueToday}</option>
                        <option value="this_week">{AR_LABELS.dueThisWeek}</option>
                        <option value="overdue">{AR_LABELS.overdue}</option>
                    </select>
                    <div className="flex items-center justify-end bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                        <button onClick={() => setView('list')} className={`p-2 rounded-md ${view === 'list' ? 'bg-white dark:bg-gray-800 shadow' : ''}`} aria-label={AR_LABELS.listView}><TableViewIcon/></button>
                        <button onClick={() => setView('calendar')} className={`p-2 rounded-md ${view === 'calendar' ? 'bg-white dark:bg-gray-800 shadow' : ''}`} aria-label={AR_LABELS.calendarView}><GridViewIcon/></button>
                    </div>
                </div>
            </div>

            {view === 'list' && (
                 <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-right">
                             <thead className="bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{AR_LABELS.chequeNumberShort}</th>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{AR_LABELS.supplier}</th>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{AR_LABELS.amount}</th>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{AR_LABELS.dueDate}</th>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{AR_LABELS.status}</th>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase text-center">{AR_LABELS.actions}</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredCheques.map(cheque => (
                                    <tr key={cheque.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-800 dark:text-gray-200">{cheque.chequeNumber}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{cheque.supplierName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-orange-600">{cheque.chequeAmount.toLocaleString('ar-SA', {style: 'currency', currency: 'SAR'})}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{new Date(cheque.chequeDueDate).toLocaleDateString('ar-SA')}</td>
                                        <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${CHEQUE_STATUS_STYLES[cheque.status].bg} ${CHEQUE_STATUS_STYLES[cheque.status].text}`}>{CHEQUE_STATUS_STYLES[cheque.status].label}</span></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm"><button onClick={() => setModalCheque(cheque)} className="text-indigo-600 hover:text-indigo-900 p-1" title={AR_LABELS.edit}><EditIcon/></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                 </div>
            )}
            
            {view === 'calendar' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                    <div className="flex justify-between items-center mb-4">
                        <button onClick={() => changeMonth(-1)} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">{"<"}</button>
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                            {currentDate.toLocaleString('ar-SA', { month: 'long', year: 'numeric' })}
                        </h2>
                        <button onClick={() => changeMonth(1)} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">{">"}</button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-gray-500 dark:text-gray-400 border-b dark:border-gray-700 pb-2 mb-1">
                        {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map(day => <div key={day}>{day}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {calendarData.calendarGrid.map((day, index) => (
                            <div key={index} className={`h-28 border border-gray-100 dark:border-gray-700/50 rounded-md p-1 overflow-hidden ${!day ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}>
                                {day && (
                                    <>
                                        <span className={`text-xs font-semibold ${
                                            new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear()
                                            ? 'bg-orange-500 text-white rounded-full px-1.5 py-0.5' : 'text-gray-700 dark:text-gray-300'
                                        }`}>{day}</span>
                                        <div className="mt-1 space-y-1 overflow-y-auto max-h-20">
                                            {calendarData.chequesByDate[day]?.map(cheque => (
                                                <div key={cheque.id} onClick={() => setModalCheque(cheque)} className={`p-1 rounded text-xs cursor-pointer ${CHEQUE_STATUS_STYLES[cheque.status].bg} ${CHEQUE_STATUS_STYLES[cheque.status].text}`}>
                                                    <p className="font-bold truncate">{cheque.supplierName}</p>
                                                    <p className="font-mono">{cheque.chequeAmount.toLocaleString()}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            <ChequeDetailsModal cheque={modalCheque} onClose={() => setModalCheque(null)} onStatusChange={handleStatusChange} />
        </div>
    );
};

export default ChequesPage;
