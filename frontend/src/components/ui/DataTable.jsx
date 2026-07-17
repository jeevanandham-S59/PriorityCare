import React from 'react';
import Spinner from './Spinner';
import EmptyState from './EmptyState';

const DataTable = ({
  columns,
  data,
  loading = false,
  emptyTitle,
  emptyDescription,
  emptyAction,
  emptyIcon,
  rowKey = 'id',
  onRowClick,
  style,
}) => {
  if (loading) {
    return (
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <div className="skeleton-line" style={{ width: '40%', height: '14px' }} />
        </div>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '1rem' }}>
            <div className="skeleton-line" style={{ width: '25%' }} />
            <div className="skeleton-line" style={{ width: '30%' }} />
            <div className="skeleton-line" style={{ width: '20%' }} />
            <div className="skeleton-line" style={{ width: '15%' }} />
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon || '\uD83D\uDCCB'}
        title={emptyTitle || 'No records found'}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return (
    <div className="card" style={{ padding: 0, overflowX: 'auto', ...style }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-color)', background: '#f8fafc' }}>
            {columns.map(col => (
              <th
                key={col.key}
                style={{
                  padding: '0.85rem 1rem',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  ...col.headerStyle,
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={row[rowKey] || idx}
              className={onRowClick ? 'table-row-hover' : ''}
              style={{ borderBottom: '1px solid var(--border-color)', cursor: onRowClick ? 'pointer' : 'default' }}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map(col => (
                <td
                  key={col.key}
                  style={{
                    padding: '0.85rem 1rem',
                    fontSize: '0.9rem',
                    ...col.cellStyle,
                  }}
                >
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const Pagination = ({ page, total, limit, onPageChange }) => {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '0.85rem 1.5rem', borderTop: '1px solid var(--border-color)',
      flexWrap: 'wrap', gap: '0.5rem',
    }}>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
      </span>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          className="btn btn-secondary"
          style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          \u25C0 Previous
        </button>
        <button
          className="btn btn-secondary"
          style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next \u25B6
        </button>
      </div>
    </div>
  );
};

export { Pagination };
export default DataTable;
