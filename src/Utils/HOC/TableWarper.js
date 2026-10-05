import React, { forwardRef, useImperativeHandle, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Card, CardBody } from 'reactstrap';
import Loader from '../../Components/CommonComponent/Loader';
import TableBottom from '../../Components/Table/TableBottom';
import TableTitle from '../../Components/Table/TableTitle';
import TableTop from '../../Components/Table/TableTop';
import request from '../AxiosUtils';
import useDelete from '../Hooks/useDelete';
import TableDeleteOption from '../../Components/Table/TableDeleteOption';
import TableDuplicateOption from '../../Components/Table/TableDuplicateOption';
import { RiCloseLine } from 'react-icons/ri';
import usePermissionCheck from '../Hooks/usePermissionCheck';

const TableWarper = (WrappedComponent) => {

  const HocComponent = forwardRef(
    ({ url, loading, moduleName, setFieldValue, userIdParams, type, paramsProps, onlyTitle, isCheck, setIsCheck, isReplicate, dateRange, filterHeader, importExport, keyInPermission, ...props }, ref) => {
      const router = useRouter();
      const [edit, destroy] = usePermissionCheck(["edit", "destroy"], keyInPermission ? keyInPermission : "");
      const [paginate, setPaginate] = useState(15);
      const [page, setPage] = useState(1);
      const [search, setSearch] = useState('');
      const [date, setDate] = useState([{ startDate: null, endDate: null, key: 'selection' }]);
      const [sortBy, setSortBy] = useState({ field: '', sort: 'asc' });
      const { mutate, isLoading: load } = useDelete(url);
      let ifParamsData = paramsProps ? Object.keys(paramsProps)[0] : '';
      const { data, isLoading, refetch, fetchStatus } = useQuery([url], () => request({
        url, method: 'get', params: { paginate, page, search, sort: sortBy?.sort, field: sortBy?.field, type: type, start_date: date[0]?.startDate ?? null, end_date: date[0]?.endDate ?? null, ...paramsProps }
      }, router), { refetchOnWindowFocus: false, refetchOnMount: false, staleTime: 30 * 1000, cacheTime: 2 * 60 * 1000 });

      // To use this function in parent
      useImperativeHandle(ref, () => ({ call() { refetch(); } }));

      useEffect(() => {
        (!loading || url) && refetch();
      }, [paginate, page, date, search, loading, load, sortBy, type, paramsProps ? paramsProps[ifParamsData] : '']);

      useEffect(() => {
        setIsCheck && setIsCheck([]);
      }, [page, paginate, search, sortBy, date, type]);

      useEffect(() => {
        if (data) {
          const items = userIdParams ? data?.data : data?.data?.data;
          if (Array.isArray(items) && items.length === 0) {
            setIsCheck && setIsCheck([]);
          }
        }
        if (setFieldValue) {
          setFieldValue ? setFieldValue('showBalance', data?.data?.balance) : '';
        }
      }, [data]);
      if (isLoading) return <Loader />;
      return (
        <>
          <Card>
            <CardBody className='custom-role'>
              <TableTitle moduleName={moduleName} type={type} onlyTitle={onlyTitle} filterHeader={filterHeader} importExport={importExport} refetch={refetch} />
              {(filterHeader?.noPageDrop !== true || filterHeader?.noSearch !== true) && (
                <TableTop setPaginate={setPaginate} setSearch={setSearch} paginate={paginate} isCheck={isCheck} setIsCheck={setIsCheck} url={url} isReplicate={isReplicate} refetch={refetch} dateRange={dateRange} date={date} setDate={setDate} filterHeader={filterHeader} keyInPermission={keyInPermission} />
              )}
              <div className='table-responsive border-table'>
                <WrappedComponent
                  data={userIdParams ? data?.data : data?.data?.data} sortBy={sortBy} setSortBy={setSortBy} moduleName={moduleName} type={type} current_page={userIdParams ? data?.data?.transactions?.current_page : data?.data?.current_page} per_page={userIdParams ? data?.data?.transactions?.per_page : data?.data?.per_page} mutate={mutate}
                  url={url} userIdParams={userIdParams} fetchStatus={fetchStatus} refetch={refetch} isCheck={isCheck} setIsCheck={setIsCheck} {...props} keyInPermission={keyInPermission} />
              </div>
            </CardBody>
            {filterHeader?.noPagination !== true && (
              <TableBottom
                current_page={userIdParams ? data?.data?.transactions?.current_page : data?.data?.current_page}
                total={userIdParams ? data?.data?.transactions?.total : data?.data?.total}
                per_page={userIdParams ? data?.data?.transactions?.per_page : data?.data?.per_page}
                setPage={setPage}
              />
            )}
          </Card>

          {isCheck && isCheck.length > 0 && (
            <div
              className="position-fixed start-50 translate-middle-x"
              style={{
                bottom: '30px',
                zIndex: 1050,
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(226, 232, 240, 0.8)',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                borderRadius: '16px',
                padding: '12px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                minWidth: '320px',
                maxWidth: '90vw',
                animation: 'tableWarperSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              }}
            >
              <style dangerouslySetInnerHTML={{__html: `
                @keyframes tableWarperSlideUp {
                  from { transform: translate(-50%, 100px); opacity: 0; }
                  to { transform: translate(-50%, 0); opacity: 1; }
                }
                .bulk-action-btn a {
                  margin: 0 !important;
                  height: 38px;
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                  gap: 6px;
                  border-radius: 8px !important;
                  padding: 8px 16px !important;
                  font-weight: 500 !important;
                  font-size: 14px !important;
                  transition: all 0.2s ease;
                  cursor: pointer;
                }
                .bulk-delete-btn a {
                  border: 1px solid #fee2e2 !important;
                  background-color: #fef2f2 !important;
                  color: #ef4444 !important;
                }
                .bulk-delete-btn a:hover {
                  background-color: #fee2e2 !important;
                  border-color: #fca5a5 !important;
                  color: #dc2626 !important;
                }
                .bulk-duplicate-btn a {
                  border: 1px solid #e2e8f0 !important;
                  background-color: #f8fafc !important;
                  color: #475569 !important;
                }
                .bulk-duplicate-btn a:hover {
                  background-color: #f1f5f9 !important;
                  border-color: #cbd5e1 !important;
                  color: #1e293b !important;
                }
              `}} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    backgroundColor: 'var(--theme-color, #0da89b)',
                    color: '#fff',
                    borderRadius: '9999px',
                    width: '24px',
                    height: '24px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: '700',
                  }}
                >
                  {isCheck.length}
                </span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                  selected
                </span>
              </div>

              <div style={{ height: '24px', width: '1px', backgroundColor: '#e2e8f0' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {isReplicate && edit && (
                  <div className="bulk-action-btn bulk-duplicate-btn">
                    <TableDuplicateOption
                      isReplicate={isReplicate}
                      url={url}
                      isCheck={isCheck}
                      setIsCheck={setIsCheck}
                      refetch={refetch}
                    />
                  </div>
                )}
                {destroy && (
                  <div className="bulk-action-btn bulk-delete-btn">
                    <TableDeleteOption
                      url={url}
                      setIsCheck={setIsCheck}
                      isCheck={isCheck}
                    />
                  </div>
                )}
              </div>

              <button
                onClick={() => setIsCheck && setIsCheck([])}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  borderRadius: '9999px',
                  transition: 'all 0.2s',
                  marginLeft: 'auto',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                  e.currentTarget.style.color = '#64748b';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#94a3b8';
                }}
                title="Clear selection"
              >
                <RiCloseLine size={20} />
              </button>
            </div>
          )}
        </>
      );
    },
  );
  return HocComponent;
};

export default TableWarper;
