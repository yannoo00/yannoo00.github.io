import type { ReactNode } from 'react'
import { canRun, type TableInfo, type TableOp } from './tableEdit'

interface TableToolbarProps {
  info: TableInfo
  left: number
  top: number
  onRun: (op: TableOp) => void
}

const PATHS = {
  rowAbove: 'M4 14h16v6H4zM12 3v8M8 7h8',
  rowBelow: 'M4 4h16v6H4zM12 13v8M8 17h8',
  colLeft: 'M14 4h6v16h-6zM3 12h8M7 8v8',
  colRight: 'M4 4h6v16H4zM13 12h8M17 8v8',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  left: 'M19 12H5M11 6l-6 6 6 6',
  right: 'M5 12h14M13 6l6 6-6 6',
  trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13M10 11v6M14 11v6',
  alignLeft: 'M4 6h16M4 10h10M4 14h16M4 18h10',
  alignCenter: 'M4 6h16M7 10h10M4 14h16M7 18h10',
  alignRight: 'M4 6h16M10 10h10M4 14h16M10 18h10',
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** 커서가 표 안에 있을 때 표 아래에 띄우는 행·열 편집 도구 */
export default function TableToolbar({ info, left, top, onRun }: TableToolbarProps) {
  const button = (label: string, d: string, op: TableOp, active = false): ReactNode => (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active || undefined}
      disabled={!canRun(info, op)}
      // 누르는 순간 편집기의 커서가 표 밖으로 빠지지 않도록 포커스를 옮기지 않는다
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onRun(op)}
    >
      <Icon d={d} />
    </button>
  )

  const rowCount = info.bottom - info.top
  const colCount = info.right - info.left

  return (
    <div className="table-toolbar" style={{ left, top }} role="toolbar" aria-label="표 편집">
      <span className="table-toolbar-label">행{rowCount > 1 ? ` ${rowCount}개` : ''}</span>
      {button('위에 행 추가', PATHS.rowAbove, { type: 'addRow', after: false })}
      {button('아래에 행 추가', PATHS.rowBelow, { type: 'addRow', after: true })}
      {button('행 위로 옮기기', PATHS.up, { type: 'moveRow', dir: -1 })}
      {button('행 아래로 옮기기', PATHS.down, { type: 'moveRow', dir: 1 })}
      {button('행 삭제', PATHS.trash, { type: 'deleteRow' })}
      <span className="table-toolbar-sep" />
      <span className="table-toolbar-label">열{colCount > 1 ? ` ${colCount}개` : ''}</span>
      {button('왼쪽에 열 추가', PATHS.colLeft, { type: 'addCol', after: false })}
      {button('오른쪽에 열 추가', PATHS.colRight, { type: 'addCol', after: true })}
      {button('열 왼쪽으로 옮기기', PATHS.left, { type: 'moveCol', dir: -1 })}
      {button('열 오른쪽으로 옮기기', PATHS.right, { type: 'moveCol', dir: 1 })}
      {button('열 삭제', PATHS.trash, { type: 'deleteCol' })}
      <span className="table-toolbar-sep" />
      {button('왼쪽 정렬', PATHS.alignLeft, { type: 'align', value: 'left' }, info.align === 'left')}
      {button('가운데 정렬', PATHS.alignCenter, { type: 'align', value: 'center' }, info.align === 'center')}
      {button('오른쪽 정렬', PATHS.alignRight, { type: 'align', value: 'right' }, info.align === 'right')}
      <span className="table-toolbar-sep" />
      <button
        type="button"
        className="table-toolbar-delete"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onRun({ type: 'deleteTable' })}
      >
        표 삭제
      </button>
    </div>
  )
}
