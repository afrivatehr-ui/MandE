import { useMemo, useState } from 'react'

/**
 * Sortable table base. Columns: { key, header, sortable, align, render(row), sortValue(row) }.
 * Filtering is handled by the parent (pass already-filtered rows); this handles
 * client-side sorting + presentation.
 */
export default function DataTable({ columns, rows, rowKey = (r) => r.id, onRowClick, emptyState }) {
  const [sort, setSort] = useState({ key: null, dir: 'asc' })

  const sorted = useMemo(() => {
    if (!sort.key) return rows
    const col = columns.find((c) => c.key === sort.key)
    if (!col) return rows
    const get = col.sortValue || ((r) => r[sort.key])
    return [...rows].sort((a, b) => {
      const av = get(a)
      const bv = get(b)
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'number' && typeof bv === 'number') {
        return sort.dir === 'asc' ? av - bv : bv - av
      }
      return sort.dir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av))
    })
  }, [rows, sort, columns])

  function toggleSort(key) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
  }

  if (!rows.length && emptyState) return emptyState

  return (
    <div className="overflow-x-auto rounded-card border border-afri-lavender bg-afri-white">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-afri-lavender bg-afri-lavender/40">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 font-heading text-xs font-semibold uppercase tracking-wide text-afri-purple ${
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''
                }`}
              >
                {col.sortable ? (
                  <button
                    onClick={() => toggleSort(col.key)}
                    className="inline-flex items-center gap-1 hover:text-afri-purple/70"
                  >
                    {col.header}
                    <span className="text-[9px]">
                      {sort.key === col.key ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b border-afri-lavender/60 last:border-0 ${
                onRowClick ? 'cursor-pointer hover:bg-afri-lavender/30' : ''
              }`}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-4 py-3 font-body text-sm text-afri-black ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''
                  }`}
                >
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
