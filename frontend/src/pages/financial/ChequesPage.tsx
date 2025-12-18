import React, { useState, useMemo, useEffect } from 'react';
import { PurchaseOrder, ChequeDetails, ChequeStatus } from '@/features/financial/types';
import { AR_LABELS, UUID, SearchIcon, GridViewIcon, TableViewIcon, ClockIcon, ChequesIcon, XIcon, CheckCircleIcon, EditIcon } from '@/shared/constants';
import { MetricCard } from '@/shared/components/ui/MetricCard';
import CustomDropdown, { DropdownOption } from '@/shared/components/ui/CustomDropdown/CustomDropdown';
import { formatDate } from '@/shared/utils';
import { useResponsiveViewMode } from '@/shared/hooks';

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
                    <p><strong>{AR_LABELS.dueDate}:</strong> {formatDate(cheque.chequeDueDate)}</p>
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
    // Use responsive hook: 'list' (table) on large screens, 'calendar' (grid) on small screens
    // Map: 'list' = 'table', 'calendar' = 'grid'
    // Hook defaults: large='table', small='grid'
    // So: large='list', small='calendar' ✓
    const { viewMode, setViewMode } = useResponsiveViewMode('cheques', 'table', 'grid');
    const view = viewMode === 'table' ? 'list' : 'calendar';
    const setView = (newView: 'list' | 'calendar') => {
        setViewMode(newView === 'list' ? 'table' : 'grid');
    };
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
        <div className="relative min-h-screen overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-amber-50/20 to-orange-100/30 dark:from-slate-950 dark:via-amber-950/20 dark:to-orange-950/30" />
            <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-orange-400/15 to-amber-400/15 blur-3xl animate-pulse" />
            <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-rose-400/15 to-orange-400/15 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
            <div className="absolute top-1/2 left-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-slate-400/10 to-orange-400/10 blur-2xl animate-pulse" style={{ animationDelay: '4s' }} />

            <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
                <div />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MetricCard id={1} title={AR_LABELS.totalPending} value={summaryMetrics.pending.total.toLocaleString('ar-SA', {style: 'currency', currency: 'SAR'})} icon={<ChequesIcon />} bgColor="bg-blue-100" valueColor="text-blue-600" />
                    <MetricCard id={2} title={AR_LABELS.totalOverdue} value={summaryMetrics.overdue.total.toLocaleString('ar-SA', {style: 'currency', currency: 'SAR'})} icon={<ClockIcon />} bgColor="bg-yellow-100" valueColor="text-yellow-600" />
                    <MetricCard id={3} title={AR_LABELS.totalBounced} value={summaryMetrics.bounced.total.toLocaleString('ar-SA', {style: 'currency', currency: 'SAR'})} icon={<XIcon className="h-6 w-6"/>} bgColor="bg-red-100" valueColor="text-red-600" />
                    <MetricCard id={4} title={AR_LABELS.totalCleared} value={summaryMetrics.cleared.total.toLocaleString('ar-SA', {style: 'currency', currency: 'SAR'})} icon={<CheckCircleIcon className="h-6 w-6"/>} bgColor="bg-green-100" valueColor="text-green-600" />
                </div>

                <div className="bg-white/95 dark:bg-gray-800/95 rounded-2xl shadow-sm p-4 sm:p-6 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50">
                    <div className="flex flex-col sm:flex-row items-stretch gap-3 sm:gap-4">
                        <div className="relative flex-1 w-full sm:w-auto">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input type="text" placeholder={AR_LABELS.searchByChequeOrSupplier} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-right"/>
                        </div>
                        <div className="w-full sm:w-auto">
                            <CustomDropdown
                                id="status-filter-cheques"
                                value={filters.status}
                                onChange={(value) => setFilters(f => ({...f, status: value}))}
                                options={[
                                    { value: 'all', label: AR_LABELS.allStatuses },
                                    { value: 'Pending', label: AR_LABELS.pending },
                                    { value: 'Cleared', label: AR_LABELS.cleared },
                                    { value: 'Bounced', label: AR_LABELS.bounced },
                                ]}
                                placeholder={AR_LABELS.allStatuses}
                                className="w-full sm:w-auto"
                            />
                        </div>
                        <div className="w-full sm:w-auto">
                            <CustomDropdown
                                id="date-filter-cheques"
                                value={filters.date}
                                onChange={(value) => setFilters(f => ({...f, date: value}))}
                                options={[
                                    { value: 'all', label: AR_LABELS.allDates },
                                    { value: 'today', label: AR_LABELS.dueToday },
                                    { value: 'this_week', label: AR_LABELS.dueThisWeek },
                                    { value: 'overdue', label: AR_LABELS.overdue },
                                ]}
                                placeholder={AR_LABELS.allDates}
                                className="w-full sm:w-auto"
                            />
                        </div>
                        <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden w-full sm:w-auto flex-shrink-0">
                            <button onClick={() => setView('list')} className={`flex-1 sm:flex-none px-3 py-2 ${view === 'list' ? 'bg-orange-500 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`} aria-label={AR_LABELS.listView}><TableViewIcon/></button>
                            <button onClick={() => setView('calendar')} className={`flex-1 sm:flex-none px-3 py-2 ${view === 'calendar' ? 'bg-orange-500 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`} aria-label={AR_LABELS.calendarView}><GridViewIcon/></button>
                        </div>
                    </div>
                </div>

                {view === 'list' && (
                    <div className="bg-white/95 dark:bg-gray-800/95 rounded-2xl shadow-sm overflow-hidden backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50">
                        <div className="overflow-x-auto overscroll-contain">
                            <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 text-right">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-2 py-3 sm:px-4 sm:py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{AR_LABELS.chequeNumberShort}</th>
                                        <th className="px-2 py-3 sm:px-4 sm:py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{AR_LABELS.supplier}</th>
                                        <th className="px-2 py-3 sm:px-4 sm:py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{AR_LABELS.amount}</th>
                                        <th className="px-2 py-3 sm:px-4 sm:py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{AR_LABELS.dueDate}</th>
                                        <th className="px-2 py-3 sm:px-4 sm:py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{AR_LABELS.status}</th>
                                        <th className="px-2 py-3 sm:px-4 sm:py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider text-center">{AR_LABELS.actions}</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {filteredCheques.map(cheque => (
                                        <tr key={cheque.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="px-2 py-3 sm:px-4 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-mono text-gray-800 dark:text-gray-200">{cheque.chequeNumber}</td>
                                            <td className="px-2 py-3 sm:px-4 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[120px] sm:max-w-none">{cheque.supplierName}</td>
                                            <td className="px-2 py-3 sm:px-4 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-orange-600">{cheque.chequeAmount.toLocaleString('ar-SA', {style: 'currency', currency: 'SAR'})}</td>
                                            <td className="px-2 py-3 sm:px-4 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-700 dark:text-gray-300">{formatDate(cheque.chequeDueDate)}</td>
                                            <td className="px-2 py-3 sm:px-4 sm:py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${CHEQUE_STATUS_STYLES[cheque.status].bg} ${CHEQUE_STATUS_STYLES[cheque.status].text}`}>{CHEQUE_STATUS_STYLES[cheque.status].label}</span></td>
                                            <td className="px-2 py-3 sm:px-4 sm:py-4 whitespace-nowrap text-center text-xs sm:text-sm"><button onClick={() => setModalCheque(cheque)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 p-1" title={AR_LABELS.edit}><EditIcon/></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {view === 'calendar' && (
                    <div className="bg-white/95 dark:bg-gray-800/95 rounded-2xl shadow-sm p-6 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50">
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
                                <div key={index} className={`h-28 border border-gray-100 dark:border-gray-700/50 rounded-lg p-1 overflow-hidden ${!day ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}>
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
        </div>
    );
};

export default ChequesPage;
