import React, { useState, useMemo, useEffect } from 'react';
import { 
  fetchVideoMetrics, 
  fetchLiveReports, 
  fetchStores,
  fetchTeamCDDailyReports,
  createTeamCDDailyReport,
  updateTeamCDDailyReport,
  deleteTeamCDDailyReport
} from '../services/dataService';
import { TeamCDReportData, TeamCDDailyReport, VideoMetric, LiveReport, Store } from '../types';
import { TeamCDDailyReportModal } from '../components/TeamCDDailyReportModal';
import { exportToExcel } from '../utils/excelUtils';
import { formatCurrency } from '../utils/formatUtils';

// Dropdown with checkboxes component
const DropdownCheckbox: React.FC<{
  label: string;
  options: { value: string; label: string }[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
}> = ({ label, options, selectedValues, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter(v => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const displayText = selectedValues.length === 0
    ? 'Tất cả (全部)'
    : selectedValues.length === 1
    ? options.find(opt => opt.value === selectedValues[0])?.label || 'Đã chọn'
    : `Đã chọn ${selectedValues.length}`;

  return (
    <div className="flex items-center gap-2 relative" ref={dropdownRef}>
      <label className="text-xs text-gray-600 whitespace-nowrap">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:border-brand-navy bg-white min-w-[150px] text-left flex items-center justify-between"
        >
          <span className="text-xs text-gray-700 truncate">{displayText}</span>
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isOpen && (
          <div className="absolute z-50 mt-1 w-64 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto">
            <div className="p-2 space-y-1">
              {options.map(option => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(option.value)}
                    onChange={() => handleToggle(option.value)}
                    className="rounded border-gray-300 text-brand-navy focus:ring-brand-navy"
                  />
                  <span className="text-xs text-gray-700 flex-1">{option.label}</span>
                </label>
              ))}
              {options.length === 0 && (
                <p className="text-xs text-gray-400 p-2">Không có tùy chọn</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Component for report row with image modal
const ReportRow: React.FC<{
  report: TeamCDDailyReport;
  index: number;
  store?: Store;
  totalQuantity: number;
  onEdit: (report: TeamCDDailyReport) => void;
  onDelete: (id: string) => void;
}> = ({ report, index, store, totalQuantity, onEdit, onDelete }) => {
  const [showImageModal, setShowImageModal] = useState(false);

  return (
    <>
      <tr className="border-b hover:bg-gray-50">
        <td className="px-4 py-3 text-gray-600">{index + 1}</td>
        <td className="px-4 py-3 text-gray-800">{report.date}</td>
        <td className="px-4 py-3">
          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs border border-purple-200">
            {store?.name || report.storeId || '-'}
          </span>
        </td>
        <td className="px-4 py-3 text-gray-600">{report.shift || '-'}</td>
        <td className="px-4 py-3">
          <span className={`px-2 py-1 rounded text-xs ${
            report.session === 'SANG' ? 'bg-yellow-100 text-yellow-800' :
            report.session === 'CHIEU' ? 'bg-orange-100 text-orange-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {report.session === 'SANG' ? 'Sáng' : report.session === 'CHIEU' ? 'Chiều' : 'Tối'}
          </span>
        </td>
        <td className="px-4 py-3 text-right text-gray-600">{report.time || 0}h</td>
        <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(report.salary || 0)}</td>
        <td className="px-4 py-3">
          {report.products && report.products.length > 0 ? (
            <div className="space-y-1">
              {report.products.map((product, idx) => (
                <div key={idx} className="text-xs text-gray-700">
                  <span className="font-medium">{product.productName || 'Chưa đặt tên'}</span>
                  <span className="text-gray-500 ml-2">({product.quantity || 0})</span>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-xs text-gray-400">-</span>
          )}
        </td>
        <td className="px-4 py-3 text-right font-bold text-gray-800">{totalQuantity.toLocaleString()}</td>
        <td className="px-4 py-3 text-center">
          {report.dataScreenshot ? (
            <div className="flex items-center justify-center">
              <img
                src={report.dataScreenshot}
                alt="Dữ liệu ảnh"
                className="max-w-24 max-h-24 object-contain cursor-pointer hover:opacity-80 border border-gray-200 rounded"
                onClick={() => setShowImageModal(true)}
                title="Click để xem ảnh lớn"
              />
            </div>
          ) : (
            <span className="text-xs text-gray-400">-</span>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex justify-center gap-1">
            <button
              onClick={() => onEdit(report)}
              className="text-blue-600 hover:text-blue-800 font-medium text-xs border border-blue-200 rounded px-2 py-1 bg-blue-50 hover:bg-blue-100"
              title="Sửa (编辑)"
            >
              Sửa
            </button>
            <button
              onClick={() => onDelete(report.id!)}
              className="text-red-600 hover:text-red-800 font-medium text-xs border border-red-200 rounded px-2 py-1 bg-red-50 hover:bg-red-100"
              title="Xóa (删除)"
            >
              Xóa
            </button>
          </div>
        </td>
      </tr>
      {/* Image Modal */}
      {showImageModal && report.dataScreenshot && (
        <tr>
          <td colSpan={11} className="px-4 py-4 bg-gray-50">
            <div className="relative bg-white rounded border border-gray-200 p-4">
              <button
                onClick={() => setShowImageModal(false)}
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <img
                src={report.dataScreenshot}
                alt="Dữ liệu ảnh"
                className="w-full max-h-96 object-contain"
              />
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export const TeamCDReport: React.FC = () => {
  const [reports, setReports] = useState<TeamCDReportData[]>([]);
  const [dailyReports, setDailyReports] = useState<TeamCDDailyReport[]>([]);
  const [videos, setVideos] = useState<VideoMetric[]>([]);
  const [liveReports, setLiveReports] = useState<LiveReport[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<TeamCDDailyReport | null>(null);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);

  // Filter states
  const [searchText, setSearchText] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [dateFrom, setDateFrom] = useState<string>(firstDayOfMonth.toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState<string>(today.toISOString().split('T')[0]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [videoData, liveReportData, storeData, dailyReportData] = await Promise.all([
        fetchVideoMetrics(),
        fetchLiveReports(),
        fetchStores(),
        fetchTeamCDDailyReports()
      ]);

      setVideos(videoData);
      setLiveReports(liveReportData);
      setStores(storeData.filter(s => s.id !== 'all'));
      setDailyReports(dailyReportData);

      // Aggregate data by date, product, and store
      const aggregatedData = aggregateData(videoData, liveReportData, storeData);
      setReports(aggregatedData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Aggregate data from videos and live reports
  const aggregateData = (
    videoData: VideoMetric[],
    liveData: LiveReport[],
    storeData: Store[]
  ): TeamCDReportData[] => {
    const dataMap = new Map<string, TeamCDReportData>();

    // Process video data
    videoData.forEach(video => {
      const date = video.uploadDate.split('T')[0]; // Get date part only
      const productId = video.productId || 'unknown';
      const productName = video.productId || 'Chưa xác định';
      const storeId = video.storeId;
      const key = `${date}_${productId}_${storeId}`;

      if (!dataMap.has(key)) {
        const store = storeData.find(s => s.id === storeId);
        dataMap.set(key, {
          id: key,
          date,
          productId,
          productName,
          storeId,
          storeName: store?.name || storeId,
          totalGMV: 0,
          videoGMV: 0,
          videoOrders: 0,
          livestreamGMV: 0,
          livestreamOrders: 0,
          newKOCVideoCount: 0,
          newKOCLivestreamCount: 0,
        });
      }

      const report = dataMap.get(key)!;
      report.videoGMV += video.sales || 0;
      report.videoOrders += video.orders || 0;
      // Count unique KOCs for video (using personInCharge as KOC identifier)
      // This is a simplified approach - you may need to adjust based on your data structure
      if (video.personInCharge) {
        report.newKOCVideoCount = 1; // Simplified: count as 1 per video, adjust as needed
      }
    });

    // Process live report data
    liveData.forEach(live => {
      const date = live.date;
      const productId = 'unknown'; // Live reports may not have productId
      const productName = 'Chưa xác định';
      const storeId = live.channelId;
      const key = `${date}_${productId}_${storeId}`;

      if (!dataMap.has(key)) {
        const store = storeData.find(s => s.id === storeId);
        dataMap.set(key, {
          id: key,
          date,
          productId,
          productName,
          storeId,
          storeName: store?.name || storeId,
          totalGMV: 0,
          videoGMV: 0,
          videoOrders: 0,
          livestreamGMV: 0,
          livestreamOrders: 0,
          newKOCLivestreamCount: 0,
          newKOCVideoCount: 0,
        });
      }

      const report = dataMap.get(key)!;
      report.livestreamGMV += live.gmv || 0;
      report.livestreamOrders += live.orders || 0;
      // Count unique KOCs for livestream (using hostName as KOC identifier)
      if (live.hostName) {
        report.newKOCLivestreamCount = 1; // Simplified: count as 1 per livestream, adjust as needed
      }
    });

    // Calculate total GMV
    dataMap.forEach(report => {
      report.totalGMV = report.videoGMV + report.livestreamGMV;
    });

    return Array.from(dataMap.values());
  };

  // Get unique products from daily reports
  const uniqueProducts = useMemo(() => {
    const products = new Set<string>();
    // Get products from daily reports
    dailyReports.forEach(report => {
      if (report.products && report.products.length > 0) {
        report.products.forEach(p => {
          if (p.productName) {
            products.add(p.productName);
          }
        });
      }
    });
    // Also get from aggregated reports (videos)
    videos.forEach(v => {
      if (v.productId) products.add(v.productId);
    });
    return Array.from(products).map(name => ({
      value: name,
      label: name
    }));
  }, [dailyReports, videos]);

  // Filter reports
  const filteredReports = useMemo(() => {
    let filtered = reports;

    // Filter by date range
    filtered = filtered.filter(report => {
      const reportDate = new Date(report.date);
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      return reportDate >= fromDate && reportDate <= toDate;
    });

    // Filter by store
    if (selectedFilters.stores && selectedFilters.stores.length > 0) {
      filtered = filtered.filter(report => selectedFilters.stores!.includes(report.storeId));
    }

    // Filter by product
    if (selectedFilters.products && selectedFilters.products.length > 0) {
      filtered = filtered.filter(report => {
        // Check if productId matches
        if (report.productId && selectedFilters.products!.includes(report.productId)) {
          return true;
        }
        // Check if productName matches
        if (report.productName && selectedFilters.products!.includes(report.productName)) {
          return true;
        }
        return false;
      });
    }

    // Search filter
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(report => {
        return (
          report.date.includes(searchLower) ||
          (report.productName && report.productName.toLowerCase().includes(searchLower)) ||
          (report.storeName && report.storeName.toLowerCase().includes(searchLower)) ||
          report.totalGMV.toString().includes(searchLower) ||
          report.videoGMV.toString().includes(searchLower) ||
          report.livestreamGMV.toString().includes(searchLower)
        );
      });
    }

    return filtered;
  }, [reports, selectedFilters, searchText, dateFrom, dateTo]);

  const handleExportExcel = () => {
    const exportData = filteredReports.map(report => ({
      'Ngày tháng (日期)': report.date,
      'Sản phẩm (产品)': report.productName || report.productId || 'Chưa xác định',
      'Cửa hàng (店铺)': report.storeName || report.storeId,
      'TỔNG GMV (GMV 总额)': report.totalGMV,
      'GVM VIDEO (视频 GMV)': report.videoGMV,
      'SỐ LƯỢNG ĐƠN (订单数量(视频))': report.videoOrders,
      'GMV LIVESTREAM (直播 GMV)': report.livestreamGMV,
      'SỐ LƯỢNG ĐƠN (订单数量(直播))': report.livestreamOrders,
      'SỐ LƯỢNG KOC HỢP TÁC VIDEO (mới) (合作视频的 KOC 数量(新增))': report.newKOCVideoCount,
      'SỐ LƯỢNG KOC HỢP TÁC LIVESTREAM (mới) (合作直播的 KOC 数量(新增))': report.newKOCLivestreamCount,
    }));
    exportToExcel(exportData, `team-cd-report-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleAddReport = () => {
    setEditingReport(null);
    setIsModalOpen(true);
  };

  const handleEditReport = (report: TeamCDDailyReport) => {
    setEditingReport(report);
    setIsModalOpen(true);
  };

  const handleDeleteReport = (id: string) => {
    setReportToDelete(id);
  };

  const confirmDeleteReport = async () => {
    if (reportToDelete) {
      try {
        await deleteTeamCDDailyReport(reportToDelete);
        await loadData();
        setReportToDelete(null);
        alert('Đã xóa báo cáo');
      } catch (error) {
        console.error('Error deleting report:', error);
        alert('Có lỗi xảy ra khi xóa báo cáo');
      }
    }
  };

  const handleSubmitReport = async (data: Omit<TeamCDDailyReport, 'id'>) => {
    try {
      if (editingReport?.id) {
        await updateTeamCDDailyReport(editingReport.id, data);
        alert('Đã cập nhật báo cáo');
      } else {
        await createTeamCDDailyReport(data);
        alert('Đã thêm báo cáo mới');
      }
      await loadData();
      setIsModalOpen(false);
      setEditingReport(null);
    } catch (error) {
      console.error('Error saving report:', error);
      throw error;
    }
  };

  // Calculate totals from filtered reports
  const metrics = useMemo(() => {
    const totals = filteredReports.reduce((acc, report) => {
      acc.totalGMV += report.totalGMV || 0;
      acc.videoGMV += report.videoGMV || 0;
      acc.videoOrders += report.videoOrders || 0;
      acc.livestreamGMV += report.livestreamGMV || 0;
      acc.livestreamOrders += report.livestreamOrders || 0;
      acc.newKOCVideoCount += report.newKOCVideoCount || 0;
      acc.newKOCLivestreamCount += report.newKOCLivestreamCount || 0;
      return acc;
    }, {
      totalGMV: 0,
      videoGMV: 0,
      videoOrders: 0,
      livestreamGMV: 0,
      livestreamOrders: 0,
      newKOCVideoCount: 0,
      newKOCLivestreamCount: 0,
    });
    return totals;
  }, [filteredReports]);

  // Filter daily reports
  const filteredDailyReports = useMemo(() => {
    let filtered = dailyReports;

    // Filter by date range
    filtered = filtered.filter(report => {
      const reportDate = new Date(report.date);
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      return reportDate >= fromDate && reportDate <= toDate;
    });

    // Filter by store
    if (selectedFilters.stores && selectedFilters.stores.length > 0) {
      filtered = filtered.filter(report => {
        if (!report.storeId) return false;
        return selectedFilters.stores!.includes(report.storeId);
      });
    }

    // Search filter
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(report => {
        const store = stores.find(s => s.id === report.storeId);
        return (
          report.date.includes(searchLower) ||
          (store?.name && store.name.toLowerCase().includes(searchLower)) ||
          (report.pic && report.pic.toLowerCase().includes(searchLower)) ||
          (report.account && report.account.toLowerCase().includes(searchLower)) ||
          (report.shift && report.shift.toLowerCase().includes(searchLower))
        );
      });
    }

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [dailyReports, selectedFilters, searchText, stores, dateFrom, dateTo]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 uppercase">Báo cáo team CD (团队 CD 报告)</h2>
        <button
          onClick={handleAddReport}
          className="bg-brand-navy hover:bg-brand-darkNavy text-white px-4 py-2 rounded shadow text-sm font-bold flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Thêm Báo Cáo Ngày (添加日报)
        </button>
      </div>

      {/* Filter Bar - Compact with Checkboxes */}
      <div className="bg-white rounded shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap items-start gap-4">
          <span className="text-sm font-bold text-gray-700 pt-2">Lọc nhanh: (快速筛选:)</span>
          
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

          {/* Store Dropdown with Checkboxes */}
          <DropdownCheckbox
            label="Cửa hàng (店铺):"
            options={stores.map(s => ({ value: s.id, label: s.name }))}
            selectedValues={selectedFilters.stores || []}
            onChange={(values) => setSelectedFilters(prev => ({ ...prev, stores: values }))}
          />

          {/* Product Dropdown with Checkboxes */}
          <DropdownCheckbox
            label="Sản phẩm (产品):"
            options={uniqueProducts}
            selectedValues={selectedFilters.products || []}
            onChange={(values) => setSelectedFilters(prev => ({ ...prev, products: values }))}
          />

          {/* Search */}
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <label className="text-xs text-gray-600 whitespace-nowrap">Tìm kiếm:</label>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Nhập từ khóa..."
              className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-navy flex-1"
            />
          </div>

          {/* Export and Reset Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="bg-brand-navy hover:bg-brand-darkNavy text-white px-4 py-1 rounded text-xs font-bold flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Xuất Excel
            </button>
            <button
              onClick={() => {
                setSearchText('');
                setSelectedFilters({});
                const today = new Date();
                const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                setDateFrom(firstDayOfMonth.toISOString().split('T')[0]);
                setDateTo(today.toISOString().split('T')[0]);
              }}
              className="text-gray-600 hover:text-gray-800 px-3 py-1 rounded text-xs border border-gray-300 hover:bg-gray-50"
            >
              Đặt lại
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      {isLoading ? (
        <div className="mt-4 text-center text-gray-500 py-8">Đang tải... (正在加载...)</div>
      ) : (
        <div className="mt-4">
          <h3 className="text-lg font-bold text-gray-800 uppercase mb-4">Chỉ số tổng hợp (综合指标)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
            {/* TỔNG GMV */}
            <div className="bg-white p-4 rounded shadow-sm border-l-4 border-blue-500">
              <p className="text-xs text-gray-500 uppercase font-bold mb-2">TỔNG GMV (GMV总额)</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(metrics.totalGMV)}</p>
            </div>

            {/* GVM VIDEO */}
            <div className="bg-white p-4 rounded shadow-sm border-l-4 border-green-500">
              <p className="text-xs text-gray-500 uppercase font-bold mb-2">GVM VIDEO (视频 GMV)</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(metrics.videoGMV)}</p>
            </div>

            {/* SỐ LƯỢNG ĐƠN VIDEO */}
            <div className="bg-white p-4 rounded shadow-sm border-l-4 border-green-400">
              <p className="text-xs text-gray-500 uppercase font-bold mb-2">SỐ LƯỢNG ĐƠN (订单数量(视频))</p>
              <p className="text-2xl font-bold text-green-500">{metrics.videoOrders.toLocaleString()}</p>
            </div>

            {/* GMV LIVESTREAM */}
            <div className="bg-white p-4 rounded shadow-sm border-l-4 border-red-500">
              <p className="text-xs text-gray-500 uppercase font-bold mb-2">GMV LIVESTREAM (直播 GMV)</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(metrics.livestreamGMV)}</p>
            </div>

            {/* SỐ LƯỢNG ĐƠN LIVESTREAM */}
            <div className="bg-white p-4 rounded shadow-sm border-l-4 border-red-400">
              <p className="text-xs text-gray-500 uppercase font-bold mb-2">SỐ LƯỢNG ĐƠN (订单数量(直播))</p>
              <p className="text-2xl font-bold text-red-500">{metrics.livestreamOrders.toLocaleString()}</p>
            </div>

            {/* SỐ LƯỢNG KOC HỢP TÁC VIDEO (MỚI) */}
            <div className="bg-white p-4 rounded shadow-sm border-l-4 border-purple-500">
              <p className="text-xs text-gray-500 uppercase font-bold mb-2">SỐ LƯỢNG KOC HỢP TÁC VIDEO (MỚI) (合作视频的 KOC 数量(新增))</p>
              <p className="text-2xl font-bold text-purple-600">{metrics.newKOCVideoCount.toLocaleString()}</p>
            </div>

            {/* SỐ LƯỢNG KOC HỢP TÁC LIVESTREAM (MỚI) */}
            <div className="bg-white p-4 rounded shadow-sm border-l-4 border-purple-400">
              <p className="text-xs text-gray-500 uppercase font-bold mb-2">SỐ LƯỢNG KOC HỢP TÁC LIVESTREAM (MỚI) (合作直播的 KOC 数量(新增))</p>
              <p className="text-2xl font-bold text-purple-500">{metrics.newKOCLivestreamCount.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Daily Reports Table */}
      <div className="mt-8">
        <h3 className="text-xl font-bold text-gray-800 uppercase mb-4">Báo cáo ngày đã nhập (已输入的日报)</h3>
        <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-white uppercase bg-brand-navy border-b">
                <tr>
                  <th className="px-4 py-3 text-left">STT</th>
                  <th className="px-4 py-3 text-left">Ngày (日期)</th>
                  <th className="px-4 py-3 text-left">Cửa hàng (店铺)</th>
                  <th className="px-4 py-3 text-left">CA (班)</th>
                  <th className="px-4 py-3 text-left">Buổi (班次)</th>
                  <th className="px-4 py-3 text-right">Thời gian (时间)</th>
                  <th className="px-4 py-3 text-right">Lương (工资)</th>
                  <th className="px-4 py-3 text-left">Sản phẩm (产品)</th>
                  <th className="px-4 py-3 text-right">Tổng số lượng (总数量)</th>
                  <th className="px-4 py-3 text-center">Dữ liệu ảnh (数据截图)</th>
                  <th className="px-4 py-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredDailyReports.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-gray-400">Chưa có báo cáo ngày nào (暂无日报)</td>
                  </tr>
                ) : (
                  filteredDailyReports.map((report, index) => {
                    const store = stores.find(s => s.id === report.storeId);
                    const totalQuantity = report.products?.reduce((sum, p) => sum + (p.quantity || 0), 0) || 0;
                    return (
                      <ReportRow
                        key={report.id}
                        report={report}
                        index={index}
                        store={store}
                        totalQuantity={totalQuantity}
                        onEdit={handleEditReport}
                        onDelete={handleDeleteReport}
                      />
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      <TeamCDDailyReportModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingReport(null);
        }}
        onSubmit={handleSubmitReport}
        initialData={editingReport || undefined}
        isEdit={!!editingReport}
      />

      {/* Delete Confirmation Modal */}
      {reportToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[80]">
          <div className="bg-white p-6 rounded shadow-lg max-w-sm w-full text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Xác nhận xóa? (确认删除?)</h3>
            <p className="text-sm text-gray-500 mb-6">Bạn có chắc chắn muốn xóa báo cáo này không? Hành động này không thể hoàn tác.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setReportToDelete(null)} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-gray-800">
                Hủy (取消)
              </button>
              <button onClick={confirmDeleteReport} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                Xóa (删除)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
