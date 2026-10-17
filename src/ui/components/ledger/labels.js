import { all } from '../../dom.js';
export function labelLedgerValues() {
  all('.ledger-table').forEach((table) => {
    const labels = Array.from(table.querySelectorAll('thead .ledger-th-num')).map((cell) =>
      cell.textContent.trim(),
    );
    if (!labels.length) return;
    table.querySelectorAll('tbody tr, tfoot tr').forEach((row) => {
      row.querySelectorAll('.ledger-td-num').forEach((cell, index) => {
        if (labels[index] && cell.dataset.swLedgerLabel !== labels[index])
          cell.dataset.swLedgerLabel = labels[index];
      });
    });
  });
}
