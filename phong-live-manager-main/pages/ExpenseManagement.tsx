import React, { useState, useMemo, useEffect } from 'react';
import { 
  fetchExpenses,
  createExpense,
  updateExpense,
  deleteExpense
} from '../services/dataService';
import { Expense } from '../types';
import { ExpenseModal } from '../components/ExpenseModal';
import { exportToExcel } from '../utils/excelUtils';
import { formatCurrency } from '../utils/formatUtils';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export const ExpenseManagement: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);

  // Filters
  const [dateFrom, setDateFrom] = useState(() => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return firstDayOfMonth.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [periodTypeFilter, setPeriodTypeFilter] = useState<'ALL' | 'YEAR' | 'MONTH'>('ALL');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchExpenses();
      setExpenses(data);
    } catch (error) {
      console.error('Error loading expenses:', error);
      alert('Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    let filtered = expenses;

    // Filter by date range
    filtered = filtered.filter(expense => {
      const expenseDate = new Date(expense.date);
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      return expenseDate >= fromDate && expenseDate <= toDate;
    });

    // Filter by period type
    if (periodTypeFilter !== 'ALL') {
      filtered = filtered.filter(expense => expense.periodType === periodTypeFilter);
    }

    // Search filter
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(expense => {
        return (
          expense.date.includes(searchLower) ||
          (expense.accounting && expense.accounting.toLowerCase().includes(searchLower)) ||
          (expense.payer && expense.payer.toLowerCase().includes(searchLower)) ||
          (expense.receiver && expense.receiver.toLowerCase().includes(searchLower)) ||
          (expense.description && expense.description.toLowerCase().includes(searchLower))
        );
      });
    }

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, dateFrom, dateTo, periodTypeFilter, searchText]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalsByType: Record<string, number> = {
      'LƯƠNG': 0,
      'VĂN PHÒNG': 0,
      'BẾP': 0,
      'CSKH': 0,
      'KHO': 0,
      'KHÁC': 0
    };
    let total = 0;

    filteredExpenses.forEach(expense => {
      if (expense.expenses && expense.expenses.length > 0) {
        expense.expenses.forEach(item => {
          const costType = item.costType || '';
          const amount = item.amount || 0;
          if (totalsByType.hasOwnProperty(costType)) {
            totalsByType[costType] += amount;
          }
          total += amount;
        });
      }
      // Legacy support
      if (expense.salaryCost) totalsByType['LƯƠNG'] += expense.salaryCost;
      if (expense.officeCost) totalsByType['VĂN PHÒNG'] += expense.officeCost;
      if (expense.kitchenCost) totalsByType['BẾP'] += expense.kitchenCost;
      if (expense.customerServiceCost) totalsByType['CSKH'] += expense.customerServiceCost;
      if (expense.warehouseCost) totalsByType['KHO'] += expense.warehouseCost;
      if (expense.otherCost) totalsByType['KHÁC'] += expense.otherCost;
      total += (expense.salaryCost || 0) + (expense.officeCost || 0) + 
               (expense.kitchenCost || 0) + (expense.customerServiceCost || 0) + 
               (expense.warehouseCost || 0) + (expense.otherCost || 0);
    });

    return {
      salaryCost: totalsByType['LƯƠNG'],
      officeCost: totalsByType['VĂN PHÒNG'],
      kitchenCost: totalsByType['BẾP'],
      customerServiceCost: totalsByType['CSKH'],
      warehouseCost: totalsByType['KHO'],
      otherCost: totalsByType['KHÁC'],
      total
    };
  }, [filteredExpenses]);

  // Calculate monthly expense data for stacked bar chart
  const monthlyExpenseData = useMemo(() => {
    const monthlyData: Record<string, {
      month: string;
      Lương: number;
      'Văn phòng': number;
      Bếp: number;
      CSKH: number;
      Kho: number;
      Khác: number;
      total: number;
    }> = {};

    filteredExpenses.forEach(expense => {
      // Get month from expense date
      const expenseDate = new Date(expense.date);
      const monthKey = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = `${String(expenseDate.getMonth() + 1).padStart(2, '0')}/${expenseDate.getFullYear()}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthLabel,
          Lương: 0,
          'Văn phòng': 0,
          Bếp: 0,
          CSKH: 0,
          Kho: 0,
          Khác: 0,
          total: 0
        };
      }

      // Process expenses array
      if (expense.expenses && expense.expenses.length > 0) {
        expense.expenses.forEach(item => {
          const costType = item.costType || '';
          const amount = item.amount || 0;
          
          if (costType === 'LƯƠNG') monthlyData[monthKey].Lương += amount;
          else if (costType === 'VĂN PHÒNG') monthlyData[monthKey]['Văn phòng'] += amount;
          else if (costType === 'BẾP') monthlyData[monthKey].Bếp += amount;
          else if (costType === 'CSKH') monthlyData[monthKey].CSKH += amount;
          else if (costType === 'KHO') monthlyData[monthKey].Kho += amount;
          else monthlyData[monthKey].Khác += amount;
          
          monthlyData[monthKey].total += amount;
        });
      } else {
        // Legacy support
        if (expense.salaryCost) monthlyData[monthKey].Lương += expense.salaryCost;
        if (expense.officeCost) monthlyData[monthKey]['Văn phòng'] += expense.officeCost;
        if (expense.kitchenCost) monthlyData[monthKey].Bếp += expense.kitchenCost;
        if (expense.customerServiceCost) monthlyData[monthKey].CSKH += expense.customerServiceCost;
        if (expense.warehouseCost) monthlyData[monthKey].Kho += expense.warehouseCost;
        if (expense.otherCost) monthlyData[monthKey].Khác += expense.otherCost;
        
        monthlyData[monthKey].total += (expense.salaryCost || 0) + (expense.officeCost || 0) + 
                                         (expense.kitchenCost || 0) + (expense.customerServiceCost || 0) + 
                                         (expense.warehouseCost || 0) + (expense.otherCost || 0);
      }
    });

    // Convert to array and sort by month
    return Object.values(monthlyData).sort((a, b) => {
      const [monthA, yearA] = a.month.split('/');
      const [monthB, yearB] = b.month.split('/');
      if (yearA !== yearB) return parseInt(yearA) - parseInt(yearB);
      return parseInt(monthA) - parseInt(monthB);
    });
  }, [filteredExpenses]);

  const handleAddExpense = () => {
    setEditingExpense(null);
    setIsModalOpen(true);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setIsModalOpen(true);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenseToDelete(id);
  };

  const confirmDeleteExpense = async () => {
    if (expenseToDelete) {
      try {
        await deleteExpense(expenseToDelete);
        await loadData();
        setExpenseToDelete(null);
        alert('Đã xóa thu chi');
      } catch (error) {
        console.error('Error deleting expense:', error);
        alert('Có lỗi xảy ra khi xóa thu chi');
      }
    }
  };

  const handleSubmitExpense = async (data: Omit<Expense, 'id'>) => {
    try {
      if (editingExpense?.id) {
        await updateExpense(editingExpense.id, data);
        alert('Đã cập nhật thu chi');
      } else {
        await createExpense(data);
        alert('Đã thêm thu chi mới');
      }
      await loadData();
      setIsModalOpen(false);
      setEditingExpense(null);
    } catch (error) {
      console.error('Error saving expense:', error);
      throw error;
    }
  };

  const handleExportExcel = () => {
    const exportData = filteredExpenses.map(expense => ({
      'Ngày (日期)': expense.date,
      'Hạch toán (会计)': expense.accounting || '',
      'Kỳ hạch toán (会计期间)': expense.periodType === 'YEAR' ? 'THEO NĂM' : 'THEO THÁNG',
      'CHI PHÍ LƯƠNG (工资成本)': expense.salaryCost || 0,
      'CHI PHÍ VĂN PHÒNG (办公室成本)': expense.officeCost || 0,
      'CHI PHÍ BẾP (厨房成本)': expense.kitchenCost || 0,
      'CHI PHÍ CSKH (客服成本)': expense.customerServiceCost || 0,
      'CHI PHÍ KHO (仓库成本)': expense.warehouseCost || 0,
      'KHÁC (其他)': expense.otherCost || 0,
      'DUYỆT GẤP (紧急审批)': expense.isUrgent ? 'Có' : 'Không',
      'TỔNG CHI PHÍ (总成本)': (expense.salaryCost || 0) + (expense.officeCost || 0) + 
                                (expense.kitchenCost || 0) + (expense.customerServiceCost || 0) + 
                                (expense.warehouseCost || 0) + (expense.otherCost || 0),
      'Người chi (付款人)': expense.payer || '',
      'Người nhận (收款人)': expense.receiver || '',
      'Mô tả (描述)': expense.description || ''
    }));
    exportToExcel(exportData, `expense-management-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 uppercase">Quản lý Thu Chi (收支管理)</h2>
        <button
          onClick={handleAddExpense}
          className="bg-brand-navy hover:bg-brand-darkNavy text-white px-4 py-2 rounded shadow text-sm font-bold flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Thêm Thu Chi (添加收支)
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-bold text-gray-700">Lọc nhanh: (快速筛选:)</span>
          
          {/* Date Range */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600 whitespace-nowrap">Từ ngày:</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-navy"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600 whitespace-nowrap">Đến ngày:</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-navy"
            />
          </div>

          {/* Period Type Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600 whitespace-nowrap">Kỳ hạch toán:</label>
            <select
              value={periodTypeFilter}
              onChange={(e) => setPeriodTypeFilter(e.target.value as 'ALL' | 'YEAR' | 'MONTH')}
              className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-navy"
            >
              <option value="ALL">Tất cả</option>
              <option value="MONTH">THEO THÁNG</option>
              <option value="YEAR">THEO NĂM</option>
            </select>
          </div>

          {/* Search Input */}
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-navy min-w-[150px]"
          />

          {/* Export Excel Button */}
          <button
            onClick={handleExportExcel}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded shadow text-sm font-bold flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H5a2 2 0 01-2-2V6a2 2 0 012-2h7l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2z" />
            </svg>
            Xuất Excel
          </button>

          {/* Reset Button */}
          <button
            onClick={() => {
              setSearchText('');
              setPeriodTypeFilter('ALL');
              const today = new Date();
              const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
              setDateFrom(firstDayOfMonth.toISOString().split('T')[0]);
              setDateTo(today.toISOString().split('T')[0]);
            }}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-1 rounded shadow text-sm font-bold flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4V3a1 1 0 011-1h14a1 1 0 011 1v1M4 4h16M4 4v16a1 1 0 001 1h14a1 1 0 001-1V4m-4 0l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Đặt lại
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow-sm border-l-4 border-blue-500">
          <p className="text-xs text-gray-500 uppercase font-bold">CHI PHÍ LƯƠNG</p>
          <p className="text-xl font-bold text-blue-600 mt-1">{formatCurrency(totals.salaryCost)}</p>
        </div>
        <div className="bg-white p-4 rounded shadow-sm border-l-4 border-green-500">
          <p className="text-xs text-gray-500 uppercase font-bold">CHI PHÍ VĂN PHÒNG</p>
          <p className="text-xl font-bold text-green-600 mt-1">{formatCurrency(totals.officeCost)}</p>
        </div>
        <div className="bg-white p-4 rounded shadow-sm border-l-4 border-yellow-500">
          <p className="text-xs text-gray-500 uppercase font-bold">CHI PHÍ BẾP</p>
          <p className="text-xl font-bold text-yellow-600 mt-1">{formatCurrency(totals.kitchenCost)}</p>
        </div>
        <div className="bg-white p-4 rounded shadow-sm border-l-4 border-purple-500">
          <p className="text-xs text-gray-500 uppercase font-bold">CHI PHÍ CSKH</p>
          <p className="text-xl font-bold text-purple-600 mt-1">{formatCurrency(totals.customerServiceCost)}</p>
        </div>
        <div className="bg-white p-4 rounded shadow-sm border-l-4 border-orange-500">
          <p className="text-xs text-gray-500 uppercase font-bold">CHI PHÍ KHO</p>
          <p className="text-xl font-bold text-orange-600 mt-1">{formatCurrency(totals.warehouseCost)}</p>
        </div>
        <div className="bg-white p-4 rounded shadow-sm border-l-4 border-gray-500">
          <p className="text-xs text-gray-500 uppercase font-bold">KHÁC</p>
          <p className="text-xl font-bold text-gray-600 mt-1">{formatCurrency(totals.otherCost)}</p>
        </div>
        <div className="bg-white p-4 rounded shadow-sm border-l-4 border-red-500">
          <p className="text-xs text-gray-500 uppercase font-bold">TỔNG CHI PHÍ</p>
          <p className="text-xl font-bold text-red-600 mt-1">{formatCurrency(totals.total)}</p>
        </div>
      </div>

      {/* Charts Section */}
      {totals.total > 0 && (
        <>
          {/* Stacked Bar Chart - Chi phí theo tháng */}
          <div className="bg-white p-4 rounded shadow-sm border border-gray-200 mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Chi phí theo Tháng (按月成本)</h3>
            {monthlyExpenseData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={monthlyExpenseData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    angle={-45} 
                    textAnchor="end" 
                    height={80}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    tickFormatter={(value) => formatCurrency(value)}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="rect"
                  />
                  <Bar dataKey="Lương" stackId="a" fill="#3b82f6" name="Lương" />
                  <Bar dataKey="Văn phòng" stackId="a" fill="#10b981" name="Văn phòng" />
                  <Bar dataKey="Bếp" stackId="a" fill="#eab308" name="Bếp" />
                  <Bar dataKey="CSKH" stackId="a" fill="#a855f7" name="CSKH" />
                  <Bar dataKey="Kho" stackId="a" fill="#f97316" name="Kho" />
                  <Bar dataKey="Khác" stackId="a" fill="#6b7280" name="Khác" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-gray-400">
                Không có dữ liệu trong khoảng thời gian đã chọn
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Pie Chart - Tỉ lệ chi phí */}
          <div className="bg-white p-4 rounded shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Tỉ lệ Chi phí (成本比例)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Lương', value: totals.salaryCost, color: '#3b82f6' },
                    { name: 'Văn phòng', value: totals.officeCost, color: '#10b981' },
                    { name: 'Bếp', value: totals.kitchenCost, color: '#eab308' },
                    { name: 'CSKH', value: totals.customerServiceCost, color: '#a855f7' },
                    { name: 'Kho', value: totals.warehouseCost, color: '#f97316' },
                    { name: 'Khác', value: totals.otherCost, color: '#6b7280' }
                  ].filter(item => item.value > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    { name: 'Lương', value: totals.salaryCost, color: '#3b82f6' },
                    { name: 'Văn phòng', value: totals.officeCost, color: '#10b981' },
                    { name: 'Bếp', value: totals.kitchenCost, color: '#eab308' },
                    { name: 'CSKH', value: totals.customerServiceCost, color: '#a855f7' },
                    { name: 'Kho', value: totals.warehouseCost, color: '#f97316' },
                    { name: 'Khác', value: totals.otherCost, color: '#6b7280' }
                  ].filter(item => item.value > 0).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Bar Chart - Chi phí theo loại */}
          <div className="bg-white p-4 rounded shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Chi phí theo Loại (按类型成本)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={[
                  { name: 'Lương', value: totals.salaryCost },
                  { name: 'Văn phòng', value: totals.officeCost },
                  { name: 'Bếp', value: totals.kitchenCost },
                  { name: 'CSKH', value: totals.customerServiceCost },
                  { name: 'Kho', value: totals.warehouseCost },
                  { name: 'Khác', value: totals.otherCost }
                ].filter(item => item.value > 0)}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {[
                    { name: 'Lương', value: totals.salaryCost, color: '#3b82f6' },
                    { name: 'Văn phòng', value: totals.officeCost, color: '#10b981' },
                    { name: 'Bếp', value: totals.kitchenCost, color: '#eab308' },
                    { name: 'CSKH', value: totals.customerServiceCost, color: '#a855f7' },
                    { name: 'Kho', value: totals.warehouseCost, color: '#f97316' },
                    { name: 'Khác', value: totals.otherCost, color: '#6b7280' }
                  ].filter(item => item.value > 0).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        </>
      )}

      {/* Expenses Table */}
      <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-white uppercase bg-brand-navy border-b">
              <tr>
                <th className="px-4 py-3 text-left">STT</th>
                <th className="px-4 py-3 text-left">Ngày (日期)</th>
                <th className="px-4 py-3 text-left">Hạch toán (会计)</th>
                <th className="px-4 py-3 text-left">Kỳ (期间)</th>
                <th className="px-4 py-3 text-right">Lương</th>
                <th className="px-4 py-3 text-right">Văn phòng</th>
                <th className="px-4 py-3 text-right">Bếp</th>
                <th className="px-4 py-3 text-right">CSKH</th>
                <th className="px-4 py-3 text-right">Kho</th>
                <th className="px-4 py-3 text-right">Khác</th>
                <th className="px-4 py-3 text-right font-bold">Tổng</th>
                <th className="px-4 py-3 text-left">Người chi</th>
                <th className="px-4 py-3 text-left">Người nhận</th>
                <th className="px-4 py-3 text-left">QUY TRÌNH BẢO TRÌ (维护流程)</th>
                <th className="px-4 py-3 text-center">Chứng từ</th>
                <th className="px-4 py-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={16} className="py-8 text-center text-gray-400">Đang tải... (正在加载...)</td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={16} className="py-8 text-center text-gray-400">Chưa có dữ liệu (暂无数据)</td>
                </tr>
              ) : (
                filteredExpenses.map((expense, index) => {
                  // Calculate total from expenses array
                  let total = 0;
                  // Group expenses by type for display
                  const expensesByType: Record<string, number> = {
                    'LƯƠNG': 0,
                    'VĂN PHÒNG': 0,
                    'BẾP': 0,
                    'CSKH': 0,
                    'KHO': 0,
                    'KHÁC': 0
                  };

                  if (expense.expenses && expense.expenses.length > 0) {
                    expense.expenses.forEach(e => {
                      const type = e.costType || 'KHÁC';
                      const amount = e.amount || 0;
                      // Map to standard types
                      if (type === 'LƯƠNG') expensesByType['LƯƠNG'] += amount;
                      else if (type === 'VĂN PHÒNG') expensesByType['VĂN PHÒNG'] += amount;
                      else if (type === 'BẾP') expensesByType['BẾP'] += amount;
                      else if (type === 'CSKH') expensesByType['CSKH'] += amount;
                      else if (type === 'KHO') expensesByType['KHO'] += amount;
                      else expensesByType['KHÁC'] += amount;
                      total += amount;
                    });
                  } else {
                    // Legacy support
                    expensesByType['LƯƠNG'] = expense.salaryCost || 0;
                    expensesByType['VĂN PHÒNG'] = expense.officeCost || 0;
                    expensesByType['BẾP'] = expense.kitchenCost || 0;
                    expensesByType['CSKH'] = expense.customerServiceCost || 0;
                    expensesByType['KHO'] = expense.warehouseCost || 0;
                    expensesByType['KHÁC'] = expense.otherCost || 0;
                    total = expensesByType['LƯƠNG'] + expensesByType['VĂN PHÒNG'] + 
                            expensesByType['BẾP'] + expensesByType['CSKH'] + 
                            expensesByType['KHO'] + expensesByType['KHÁC'];
                  }

                  return (
                    <tr key={expense.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600">{index + 1}</td>
                      <td className="px-4 py-3 text-gray-800">{expense.date}</td>
                      <td className="px-4 py-3 text-gray-700">{expense.accounting || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          expense.periodType === 'YEAR' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {expense.periodType === 'YEAR' 
                            ? `NĂM ${expense.periodValue || ''}` 
                            : expense.periodValue 
                              ? `THÁNG ${expense.periodValue.split('-')[1]}/${expense.periodValue.split('-')[0]}`
                              : 'THÁNG'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(expensesByType['LƯƠNG'])}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(expensesByType['VĂN PHÒNG'])}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(expensesByType['BẾP'])}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(expensesByType['CSKH'])}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(expensesByType['KHO'])}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(expensesByType['KHÁC'])}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-800">{formatCurrency(total)}</td>
                      <td className="px-4 py-3 text-gray-700">{expense.payer || '-'}</td>
                      <td className="px-4 py-3 text-gray-700">{expense.receiver || '-'}</td>
                      <td className="px-4 py-3 text-gray-700">{expense.maintenanceProcess || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        {expense.paymentVoucher ? (
                          <img
                            src={expense.paymentVoucher}
                            alt="Chứng từ"
                            className="max-w-16 max-h-16 object-contain cursor-pointer hover:opacity-80 border border-gray-200 rounded mx-auto"
                            onClick={() => {
                              // Open image in modal or new window
                              const img = document.createElement('img');
                              img.src = expense.paymentVoucher!;
                              img.style.maxWidth = '90vw';
                              img.style.maxHeight = '90vh';
                              img.style.objectFit = 'contain';
                              const div = document.createElement('div');
                              div.style.position = 'fixed';
                              div.style.top = '0';
                              div.style.left = '0';
                              div.style.width = '100vw';
                              div.style.height = '100vh';
                              div.style.backgroundColor = 'rgba(0,0,0,0.8)';
                              div.style.display = 'flex';
                              div.style.alignItems = 'center';
                              div.style.justifyContent = 'center';
                              div.style.zIndex = '9999';
                              div.style.cursor = 'pointer';
                              div.appendChild(img);
                              div.onclick = () => div.remove();
                              document.body.appendChild(div);
                            }}
                            title="Click để xem ảnh lớn"
                          />
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => handleEditExpense(expense)}
                            className="text-blue-600 hover:text-blue-800 font-medium text-xs border border-blue-200 rounded px-2 py-1 bg-blue-50 hover:bg-blue-100"
                            title="Sửa (编辑)"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(expense.id!)}
                            className="text-red-600 hover:text-red-800 font-medium text-xs border border-red-200 rounded px-2 py-1 bg-red-50 hover:bg-red-100"
                            title="Xóa (删除)"
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <ExpenseModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingExpense(null);
        }}
        onSubmit={handleSubmitExpense}
        initialData={editingExpense || undefined}
        isEdit={!!editingExpense}
      />

      {/* Delete Confirmation Modal */}
      {expenseToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[80]">
          <div className="bg-white p-6 rounded shadow-lg max-w-sm w-full text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Xác nhận xóa? (确认删除?)</h3>
            <p className="text-sm text-gray-500 mb-6">Bạn có chắc chắn muốn xóa thu chi này không? Hành động này không thể hoàn tác.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setExpenseToDelete(null)} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-gray-800">
                Hủy (取消)
              </button>
              <button onClick={confirmDeleteExpense} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                Xóa (删除)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
