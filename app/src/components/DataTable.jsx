import { useMemo, useState } from 'react'

/**
 * Sortable table with a mobile card layout. Columns: { key, header, sortable, align, render(row), sortValue(row) }.
 */
export default function DataTable({
  columns,
  rows,
  rowKey = (r) => r.id,
  onRowClick,
  emptyState,
  mobilePrimaryKeys,
  hideOnMobile = [],
}) {
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

  const desktopColumns = columns.filter((c) => !hideOnMobile.includes(c.key))
  const primaryKeys = mobilePrimaryKeys ?? desktopColumns.slice(0, 2).map((c) => c.key)
  const mobileColumns = desktopColumns.filter((c) => !primaryKeys.includes(c.key) && c.key !== 'actions')

  function cellValue(col, row) {
    return col.render ? col.render(row) : row[col.key]
  }

  return (
    <>
      {/* Mobile card layout */}
      <div className="flex flex-col gap-3 md:hidden">
        {sorted.map((row) => (
          <div
            key={rowKey(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={`afri-card p-4 ${onRowClick ? 'cursor-pointer active:bg-afri-lavender/30' : ''}`}
          >
            {primaryKeys.map((key) => {
              const col = columns.find((c) => c.key === key)
              if (!col) return null
              return (
                <div key={key} className="mb-2 last:mb-0">
                  {col.header ? (
                    <p className="afri-subtle mb-0.5 font-body text-xs uppercase tracking-wide">{col.header}</p>
                  ) : null}
                  <div className="font-body text-sm">{cellValue(col, row)}</div>
                </div>
              )
            })}
            {mobileColumns.length > 0 && (
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-afri-lavender/60 pt-3 dark:border-afri-purple-light/20">
                {mobileColumns.map((col) => (
                  <div key={col.key} className={col.key === 'actions' ? 'col-span-2' : ''}>
                    {col.header ? (
                      <dt className="afri-subtle font-body text-xs">{col.header}</dt>
                    ) : null}
                    <dd className="mt-0.5 font-body text-sm">{cellValue(col, row)}</dd>
                  </div>
                ))}
              </dl>
            )}
            {columns.find((c) => c.key === 'actions') && (
              <div className="mt-3 border-t border-afri-lavender/60 pt-3 dark:border-afri-purple-light/20">
                {cellValue(columns.find((c) => c.key === 'actions'), row)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-card border border-afri-lavender bg-afri-white md:block dark:border-afri-purple-light/25 dark:bg-afri-purple-elevated">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-afri-lavender bg-afri-lavender/40 dark:border-afri-purple-light/20 dark:bg-afri-purple-surface/80">
              {desktopColumns.map((col) => (
                <th
                  key={col.key}
                  className={`whitespace-nowrap px-4 py-3 font-heading text-xs font-semibold uppercase tracking-wide text-afri-purple dark:text-afri-lavender ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''
                  }`}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className="inline-flex items-center gap-1 hover:text-afri-purple/70 dark:hover:text-afri-white"
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
                className={`border-b border-afri-lavender/60 last:border-0 dark:border-afri-purple-light/15 ${
                  onRowClick ? 'cursor-pointer hover:bg-afri-lavender/30 dark:hover:bg-afri-purple-light/10' : ''
                }`}
              >
                {desktopColumns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 font-body text-sm text-afri-black dark:text-afri-white/90 ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''
                    } ${col.key === 'actions' ? 'min-w-[14rem]' : ''}`}
                  >
                    {cellValue(col, row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
