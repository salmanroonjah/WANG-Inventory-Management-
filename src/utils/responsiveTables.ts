/**
 * Phone-friendly tables.
 *
 * On small screens (see index.css) every table row is shown as a card and
 * every cell as "Label: value". This keeps the labels in sync with each
 * table's header row by copying the <th> text into a data-label attribute on
 * the matching <td>, and re-runs whenever React re-renders a table.
 */
function labelTable(table: HTMLTableElement) {
  const headRow = table.tHead?.rows[0];
  if (!headRow) return;
  const labels: string[] = [];
  for (const th of Array.from(headRow.cells)) {
    const text = (th.textContent || '').trim();
    const span = th.colSpan || 1;
    for (let i = 0; i < span; i++) labels.push(text);
  }
  for (const body of Array.from(table.tBodies)) {
    for (const row of Array.from(body.rows)) {
      let col = 0;
      for (const cell of Array.from(row.cells)) {
        const label = labels[col] || '';
        if (cell.getAttribute('data-label') !== label) cell.setAttribute('data-label', label);
        col += cell.colSpan || 1;
      }
    }
  }
}

export function enableResponsiveTables() {
  if (typeof window === 'undefined' || typeof MutationObserver === 'undefined') return;
  let scheduled = false;
  const run = () => {
    scheduled = false;
    document.querySelectorAll('table').forEach((t) => labelTable(t as HTMLTableElement));
  };
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(run);
  };
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, characterData: true });
  schedule();
}
