import type { Fragment, Node } from '@milkdown/kit/prose/model'
import { TextSelection, type EditorState, type Transaction } from '@milkdown/kit/prose/state'
import { isInTable, selectedRect } from '@milkdown/kit/prose/tables'

export type Align = 'left' | 'center' | 'right'

export type TableOp =
  | { type: 'addRow'; after: boolean }
  | { type: 'deleteRow' }
  | { type: 'moveRow'; dir: -1 | 1 }
  | { type: 'addCol'; after: boolean }
  | { type: 'deleteCol' }
  | { type: 'moveCol'; dir: -1 | 1 }
  | { type: 'align'; value: Align }
  | { type: 'deleteTable' }

/** 커서(또는 칸 선택)가 놓인 표와 선택된 행·열 범위. 끝 값은 포함하지 않는다. */
export interface TableInfo {
  pos: number
  rows: number
  cols: number
  top: number
  bottom: number
  left: number
  right: number
  align: Align | null
}

export function getTableInfo(state: EditorState): TableInfo | null {
  if (!isInTable(state)) return null
  const rect = selectedRect(state)
  const first = rect.table.firstChild?.maybeChild(rect.left)
  const align = (first?.attrs.alignment as Align | null | undefined) ?? null
  return {
    pos: rect.tableStart - 1,
    rows: rect.map.height,
    cols: rect.map.width,
    top: rect.top,
    bottom: rect.bottom,
    left: rect.left,
    right: rect.right,
    align,
  }
}

/** 마크다운 표는 머리글 행 하나와 본문 행 하나 이상, 열 하나 이상이 있어야 한다. */
export function canRun(info: TableInfo, op: TableOp): boolean {
  switch (op.type) {
    case 'deleteRow':
      return info.rows - (info.bottom - info.top) >= 2
    case 'deleteCol':
      return info.cols - (info.right - info.left) >= 1
    case 'moveRow':
      return op.dir < 0 ? info.top > 0 : info.bottom < info.rows
    case 'moveCol':
      return op.dir < 0 ? info.left > 0 : info.right < info.cols
    default:
      return true
  }
}

function move<T>(list: T[], start: number, end: number, dir: -1 | 1) {
  const block = list.splice(start, end - start)
  list.splice(start + dir, 0, ...block)
}

/**
 * 표를 행×열 칸 목록으로 펼쳐 고친 뒤 다시 짓는다.
 * 첫 행은 늘 머리글이 되도록 짓기 때문에 머리글 행을 옮기거나 지워도 표가 깨지지 않는다.
 */
export function applyTableOp(state: EditorState, op: TableOp): Transaction | null {
  const info = getTableInfo(state)
  if (!info || !canRun(info, op)) return null
  const { schema } = state
  const table = state.doc.nodeAt(info.pos)
  if (!table) return null

  const tr = state.tr
  if (op.type === 'deleteTable') {
    tr.delete(info.pos, info.pos + table.nodeSize)
    const $pos = tr.doc.resolve(Math.min(info.pos, tr.doc.content.size))
    return tr.setSelection(TextSelection.near($pos)).scrollIntoView()
  }

  const { table_header_row, table_row, table_header, table_cell } = schema.nodes
  const grid: (Fragment | null)[][] = []
  const aligns: (string | null)[] = []
  table.forEach((row, _, r) => {
    const cells: (Fragment | null)[] = []
    for (let c = 0; c < info.cols; c++) {
      const cell = row.maybeChild(c)
      cells.push(cell?.content ?? null)
      if (r === 0) aligns.push((cell?.attrs.alignment as string | null | undefined) ?? null)
    }
    grid.push(cells)
  })

  const { top, bottom, left, right } = info
  let row = top
  let col = left
  const emptyRow = () => aligns.map(() => null)

  switch (op.type) {
    case 'addRow':
      row = op.after ? bottom : top
      grid.splice(row, 0, emptyRow())
      break
    case 'deleteRow':
      grid.splice(top, bottom - top)
      row = Math.min(top, grid.length - 1)
      break
    case 'moveRow':
      move(grid, top, bottom, op.dir)
      row = top + op.dir
      break
    case 'addCol':
      col = op.after ? right : left
      grid.forEach((cells) => cells.splice(col, 0, null))
      aligns.splice(col, 0, aligns[op.after ? right - 1 : left] ?? null)
      break
    case 'deleteCol':
      grid.forEach((cells) => cells.splice(left, right - left))
      aligns.splice(left, right - left)
      col = Math.min(left, aligns.length - 1)
      break
    case 'moveCol':
      grid.forEach((cells) => move(cells, left, right, op.dir))
      move(aligns, left, right, op.dir)
      col = left + op.dir
      break
    case 'align':
      for (let c = left; c < right; c++) aligns[c] = op.value
      break
  }

  const rows = grid.map((cells, r) => {
    const cellType = r === 0 ? table_header : table_cell
    const built = cells.map((content, c) => {
      const attrs = { alignment: aligns[c] ?? 'left' }
      return (content ? cellType.create(attrs, content) : cellType.createAndFill(attrs)) as Node
    })
    return (r === 0 ? table_header_row : table_row).create(null, built)
  })
  const next = table.type.create(table.attrs, rows)
  tr.replaceWith(info.pos, info.pos + table.nodeSize, next)

  // 고친 행·열의 칸으로 커서를 옮긴다
  let cellPos = info.pos + 1
  for (let r = 0; r < row; r++) cellPos += next.child(r).nodeSize
  cellPos += 1
  for (let c = 0; c < col; c++) cellPos += next.child(row).child(c).nodeSize
  return tr.setSelection(TextSelection.near(tr.doc.resolve(cellPos + 1))).scrollIntoView()
}
