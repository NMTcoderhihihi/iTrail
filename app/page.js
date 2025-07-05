'use client';

import React, {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import HistoryPopup from './client/ui/his';
import styles from './client/index.module.css';
import SidePanel from './client/ui/more';
import Schedule from './client/ui/schedule';
import { Data_Client, Data_Label, Re_Client, Re_History, Re_Label } from '@/data/client';
import { Get_user } from '@/data/users';
import AddLabelButton from './client/ui/addlabel';
import Loading from '@/components/(ui)/(loading)/loading';
import Label from './client/ui/label';
import Setting from './client/ui/setting';
import Run from './client/ui/run';

const PAGE_SIZE = 10;

const toTitleCase = s => s.toLowerCase().split(' ').filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
const normalize = str => str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
export const parseLabels = val => {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String);
  return val.toString().replace(/[\[\]'"]/g, '').split(',').map(s => s.trim()).filter(Boolean);
};
const getCustomerType = row => {
  if (row.remove && row.remove.trim() !== '') return 'Đã hủy';
  if (row.study) return 'Nhập học';
  if (row.studyTry) return 'Học thử';
  if (row.care) return 'Có nhu cầu';
  return 'Mới';
};
const renderCustomerTypeBadge = type => {
  const badgeBy = { 'Mới': styles.typeNew, 'Có nhu cầu': styles.typeInterested, 'Học thử': styles.typeTrial, 'Nhập học': styles.typeEnrolled, 'Đã hủy': styles.typeCancelled };
  return (<span className={`${styles.typeBadge} ${badgeBy[type] || styles.typeNew}`}>{type}</span>);
};
const applyFiltersToData = (data, { label, search, area, source, type }) => data.filter(row => {
  if (label) {
    const rowLabels = parseLabels(row.labels).join(',').toLowerCase();
    const parts = label.toLowerCase().split(',').map(s => s.trim());
    if (!parts.some(p => p && rowLabels.includes(p))) return false;
  }
  if (search) {
    const q = normalize(search);
    const name = normalize(row.nameParent || '');
    const phone = normalize(row.phone || '');
    if (!name.includes(q) && !phone.includes(q)) return false;
  }
  if (!row.area.toString().toLowerCase().includes(area.toLowerCase())) return false;
  if (!row.source.toString().toLowerCase().includes(source.toLowerCase())) return false;
  if (!getCustomerType(row).toLowerCase().includes(type.toLowerCase())) return false;
  return true;
});

const useSelection = (allItems = [], idKey = 'phone') => {
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const toggleOne = useCallback(id => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [allItems]);

  return { selectedIds, toggleOne, clear, setSelectedIds, size: selectedIds.size };
};


const Row = memo(function Row({ row, rowIndex, visibleKeys, onOpen, onToggle, checked }) {
  return (
    <div className={styles.gridRow} style={{ backgroundColor: row.remove != '' ? '#ffd9dd' : 'white' }}>
      <div className={`${styles.gridCell} ${styles.colTiny}`} style={{ textAlign: 'center', flex: 0.2 }} onClick={e => e.stopPropagation()} >
        <input type="checkbox" className={styles.bigCheckbox} checked={checked} onChange={() => onToggle(row.phone)} />
      </div>
      <div className={`${styles.gridCell} ${styles.colSmall}`} style={{ textAlign: 'center', fontWeight: 600, flex: 0.2 }} onClick={() => onOpen(row)} >
        {rowIndex + 1}
      </div>
      {visibleKeys.map(k => {
        if (k === 'labels') {
          const valu = parseLabels(row[k]);
          return (<div key={k} className={styles.gridCell} style={{ flex: .5 }} onClick={() => onOpen(row)}>{valu.length}</div>);
        }
        if (k === 'uid') {
          return (<div key={k} className={styles.gridCell} style={{ flex: 1 }} onClick={() => onOpen(row)}>{row[k] ? JSON.parse(row[k])[0] : 'Thiếu uid'}</div>);
        }
        if (['source', 'care', 'studyTry', 'study', 'remove', 'age', 'nameParent', 'time', 'email'].includes(k)) return null;
        return (
          <div key={k} className={styles.gridCell} style={{ flex: k == 'phone' || k == 'area' ? .5 : 1 }} onClick={() => onOpen(row)}>
            {k === 'type' ? renderCustomerTypeBadge(getCustomerType(row)) : Array.isArray(row[k]) ? row[k].join(', ') : row[k]}
          </div>
        );
      })}
    </div>
  );
});

export default function Client() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [data, setData] = useState([]);
  const [filters, setFilters] = useState({ label: searchParams.get('label') || '', search: searchParams.get('search') || '', area: searchParams.get('area') || '', source: searchParams.get('source') || '', type: searchParams.get('type') || '' });
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [showLabelPopup, setShowLabelPopup] = useState(false);
  const [isReloading, setIsReloading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [labelsDB, setLabelsDB] = useState([]);
  console.log(data[0]);
  const deferredSearch = useDeferredValue(filters.search);
  const filteredData = useMemo(() => applyFiltersToData(data, { ...filters, search: deferredSearch }), [data, filters, deferredSearch]);

  const { selectedIds, size: selectedCount, toggleOne: toggleSelectRow, setSelectedIds, clear: clearSelection } = useSelection(filteredData, 'phone');

  const loadInitialData = useCallback(async () => {
    setIsReloading(true);
    try {
      const [clientRes, labelRes, userRes] = await Promise.all([
        Data_Client(),
        Data_Label(),
        Get_user(),
      ]);

      setData(clientRes.data || []);
      setLabelsDB(labelRes.data || []);
      setUserData(userRes || null);

      if (userRes?.zalo) {
        setSelectedAccount(userRes.zalo.uid);
      } else {
        setSelectedAccount(null);
      }
    } catch (e) {
      console.error("Lỗi khi tải dữ liệu ban đầu:", e);
    } finally {
      setIsReloading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const totalPages = Math.max(Math.ceil(filteredData.length / PAGE_SIZE), 1);
  const currentRows = useMemo(() => { const start = (page - 1) * PAGE_SIZE; return filteredData.slice(start, start + PAGE_SIZE); }, [filteredData, page]);
  const visibleKeys = useMemo(() => (currentRows[0] ? Object.keys(currentRows[0]) : []), [currentRows]);
  const uniqueAreas = useMemo(() => { const set = new Set(); data.forEach(r => r.area && set.add(toTitleCase(r.area.toString().trim()))); return [...set].sort(); }, [data]);
  const uniqueSources = useMemo(() => { const set = new Set(); data.forEach(r => r.source && set.add(toTitleCase(r.source.toString().trim()))); return [...set].sort(); }, [data]);
  const uniqueLabels = useMemo(() => labelsDB.map(l => l.title).sort((a, b) => a.localeCompare(b, 'vi', { sensitivity: 'base' })), [labelsDB]);
  const inlineLabels = useMemo(() => uniqueLabels.slice(0, 6), [uniqueLabels]);

  const selectedLabelContent = useMemo(() => {
    if (!filters.label) return '';
    const first = filters.label.split(',').map(s => s.trim())[0];
    const found = labelsDB.find(l => l.title === first);
    return found?.content || '';
  }, [filters.label, labelsDB]);

  useEffect(() => {
    const sp = new URLSearchParams();
    if (page > 1) sp.set('page', String(page));
    Object.entries(filters).forEach(([k, v]) => v && sp.set(k, v));
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }, [page, filters, router, pathname]);

  const handleFilterChange = key => e => { setPage(1); setFilters(f => ({ ...f, [key]: e.target.value.trim() })); };
  const resetFilters = useCallback(() => { setFilters({ label: '', search: '', area: '', source: '', type: '' }); setPage(1); }, []);
  const toggleLabel = useCallback(txt => { const labels = filters.label ? filters.label.split(',').map(l => l.trim()) : []; const idx = labels.indexOf(txt); if (idx >= 0) labels.splice(idx, 1); else labels.push(txt); setFilters(f => ({ ...f, label: labels.join(', ') })); setPage(1); }, [filters.label]);

  const reloadData = useCallback(() => {
    setIsReloading(true);
    Promise.all([Re_Client(), Re_History(), Re_Label()])
      .then(() => loadInitialData())
      .catch(e => console.error("Lỗi khi làm mới dữ liệu:", e))
      .finally(() => setIsReloading(false));
  }, [loadInitialData]);

  const selectedCustomers = useMemo(() => data.filter(r => selectedIds.has(r.phone)), [data, selectedIds]);

  // const sendMessage = useCallback(async () => {
  //   if (!selectedCustomers.length || !selectedAccount) {
  //     alert("Vui lòng chọn tài khoản Zalo trong phần Cấu hình để gửi tin.");
  //     return;
  //   }
  //   try {
  //     const res = await fetch('/api/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clients: selectedCustomers, accountId: selectedAccount, defaultContent: selectedLabelContent }) });
  //     if (!res.ok) throw new Error(await res.text());
  //   } catch (err) { console.error(err); }
  // }, [selectedCustomers, selectedAccount, selectedLabelContent]);

  const closePanel = () => { setPanelOpen(false); setTimeout(() => { setSelectedRow(null); }, 310); };
  const saveNotes = async () => { setPanelOpen(false); await Re_Client(); const res = await Data_Client(); setData(res.data || []); router.refresh() };

  const headerCheckboxRef = useRef(null);
  const allOnPageChecked = useMemo(() => currentRows.length > 0 && currentRows.every(r => selectedIds.has(r.phone)), [currentRows, selectedIds]);
  const partialOnPageChecked = useMemo(() => !allOnPageChecked && currentRows.some(r => selectedIds.has(r.phone)), [allOnPageChecked, currentRows, selectedIds]);

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = partialOnPageChecked;
    }
  }, [partialOnPageChecked]);

  const handleTogglePage = useCallback(() => {
    const pageIds = new Set(currentRows.map(r => r.phone));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allOnPageChecked) {
        pageIds.forEach(id => next.delete(id));
      } else {
        pageIds.forEach(id => next.add(id));
      }
      return next;
    });
  }, [currentRows, setSelectedIds, allOnPageChecked]);

  const accountDisplayName = useMemo(() => {
    return userData?.zalo?.name || "Chưa chọn tài khoản";
  }, [userData]);
  return (
    <div className={styles.container}>
      <div className={styles.filterSection}>
        <div className={styles.filterHeader}>
          <h2 className={styles.filterTitle}>Chăm sóc khách hàng</h2>
          <div style={{ display: 'flex', gap: 16 }}>
            <button className={styles.btnAction} onClick={() => setHistoryOpen(true)}>Xem lịch sử gửi</button>
            <button className={`${styles.btnReset}${!Object.values(filters).some(Boolean) ? ` ${styles.btnDisabled}` : ''}`} onClick={resetFilters} disabled={!Object.values(filters).some(Boolean)}>Xoá bộ lọc</button>
            <button className={`${styles.btnAction} ${styles.btnReload}`} onClick={reloadData} disabled={isReloading}>{isReloading ? 'Đang tải...' : 'Làm mới dữ liệu'}</button>
          </div>
        </div>
        <div className={styles.filterChips}>
          <div style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="text_6">Nhãn phổ biến:</span>
            {inlineLabels.map(lbl => {
              const active = filters.label.includes(lbl);
              return (<button key={lbl} className={`${styles.chip}${active ? ` ${styles.chipActive}` : ''}`} onClick={() => toggleLabel(lbl)}>{lbl}{active && <span className={styles.chipRemove}>×</span>}</button>);
            })}
            {uniqueLabels.length > 6 && (<button className={styles.chip} onClick={() => setShowLabelPopup(true)}>…</button>)}
            <AddLabelButton onCreated={loadInitialData} />
          </div>
          <Label data={labelsDB} reload={loadInitialData} />
        </div>
        <div className={styles.filterControls}>
          <div className={styles.filterGroup}>
            <label htmlFor="nameFilter" className="text_6">Tìm kiếm (tên/SĐT):</label>
            <input id="nameFilter" className={styles.filterInput} placeholder="Nhập tên hoặc số điện thoại..." value={filters.search} onChange={handleFilterChange('search')} />
          </div>
          <div className={styles.filterGroup}>
            <label htmlFor="areaFilter" className="text_6">Khu vực:</label>
            <select id="areaFilter" className={styles.filterSelect} value={filters.area} onChange={handleFilterChange('area')}>
              <option value="">-- Tất cả khu vực --</option>
              {uniqueAreas.map(a => (<option key={a} value={a}>{a}</option>))}
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label htmlFor="sourceFilter" className="text_6">Nguồn:</label>
            <select id="sourceFilter" className={styles.filterSelect} value={filters.source} onChange={handleFilterChange('source')}>
              <option value="">-- Tất cả nguồn --</option>
              {uniqueSources.map(s => (<option key={s} value={s}>{s}</option>))}
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label htmlFor="typeFilter" className="text_6">Loại khách hàng:</label>
            <select id="typeFilter" className={styles.filterSelect} value={filters.type} onChange={handleFilterChange('type')}>
              <option value="">-- Tất cả loại --</option>
              {['Mới', 'Có nhu cầu', 'Học thử', 'Nhập học', 'Đã hủy'].map(t => (<option key={t} value={t}>{t}</option>))}
            </select>
          </div>
        </div>
      </div>

      <div className={styles.messageSection}>
        <div className={styles.accountSelector} style={{ flex: 1 }}>
          <label className="text_6">Gửi từ tài khoản:</label>
          <div style={{ display: 'flex' }}>
            <div className='input' style={{ width: 150, padding: '8px 12px', color: '#495057', borderRight: 'none', borderRadius: '5px 0 0 5px', display: 'flex', alignItems: 'center' }}>
              <span className='text_6_400'>{accountDisplayName}</span>
            </div>
            <Setting user={userData} onUserUpdate={loadInitialData} />
          </div>
          <Run user={userData} />
        </div>
        <Schedule data={selectedCustomers} user={userData} />
      </div>

      {isReloading ? (<Loading content="Đang tải dữ liệu..." />) : filteredData.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>📋</div>
          <p className={styles.emptyStateText}>Không tìm thấy dữ liệu nào phù hợp với bộ lọc</p>
          <button className={styles.btnReset} onClick={resetFilters}>Xoá bộ lọc</button>
        </div>
      ) : (
        <>
          <div className={styles.dataGrid}>
            <div className={styles.gridHeader}>
              <div className={`${styles.gridCell} ${styles.colTiny}`} style={{ textAlign: 'center', flex: 0.2 }} >
                <input ref={headerCheckboxRef} type="checkbox" className={styles.bigCheckbox} checked={allOnPageChecked} onChange={handleTogglePage} />
                {selectedCount > 0 && (<span style={{ fontSize: 14, marginLeft: 4, color: 'white' }}>{selectedCount}</span>)}
              </div>
              <div className={`text_6 ${styles.colSmall}`} style={{ padding: 16, color: 'white', flex: 0.2 }}>STT</div>
              {['SĐT', 'Tên học sinh', 'Khu vực', 'Số nhãn', 'Uid', 'Trường'].map(k => (
                <div key={k} className={`text_6 ${k == 'SĐT' || k == 'Số nhãn' || k == 'Khu vực' ? styles.colSmall : ''}`} style={{ padding: 16, color: 'white', flex: k == 'SĐT' || k == 'Số nhãn' || k == 'Khu vực' ? 0.5 : 1 }}>{k}</div>
              ))}
            </div>
            <div className={styles.gridBody}>
              {currentRows.map((r, idx) => (<Row key={r.phone || idx} row={r} rowIndex={(page - 1) * PAGE_SIZE + idx} visibleKeys={visibleKeys} onOpen={row => { setSelectedRow(row); setPanelOpen(true); }} onToggle={toggleSelectRow} checked={selectedIds.has(r.phone)} />))}
            </div>
          </div>
          {totalPages > 1 && (
            <div className={styles.pagination}>
              {page > 1 && (<button onClick={() => setPage(page - 1)} className={styles.pageBtn}>&laquo; Trang trước</button>)}
              <div className={styles.pageNumbers}>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) pageNum = i + 1;
                  else if (page <= 3) pageNum = i + 1;
                  else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = page - 2 + i;
                  return (<button key={pageNum} onClick={() => setPage(pageNum)} className={`${styles.pageBtn}${pageNum === page ? ` ${styles.pageBtnActive}` : ''}`}>{pageNum}</button>);
                })}
              </div>
              {page < totalPages && (<button onClick={() => setPage(page + 1)} className={styles.pageBtn}>Trang sau &raquo;</button>)}
            </div>
          )}
        </>
      )}
      {showLabelPopup && (
        <div className={styles.labelModalBackdrop} onClick={() => setShowLabelPopup(false)}>
          <div className={styles.labelModal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.labelModalTitle}>Chọn nhãn để lọc</h3>
            <div className={styles.labelModalGrid}>
              {uniqueLabels.map(lbl => {
                const active = filters.label.includes(lbl);
                return (<button key={lbl} className={`${styles.chipLarge}${active ? ` ${styles.chipActive}` : ''}`} onClick={() => { toggleLabel(lbl); setShowLabelPopup(false); }}>{lbl}{active && (<span className={styles.chipRemove}>×</span>)}</button>);
              })}
            </div>
            <button className={styles.btnCloseModal} onClick={() => setShowLabelPopup(false)}>Đóng</button>
          </div>
        </div>
      )}
      <SidePanel open={panelOpen} row={selectedRow} labels={parseLabels(selectedRow?.labels || '')} onClose={closePanel} onSave={saveNotes} />
      <HistoryPopup open={historyOpen} onClose={() => setHistoryOpen(false)} datauser={data} type="all" />
    </div>
  );
}