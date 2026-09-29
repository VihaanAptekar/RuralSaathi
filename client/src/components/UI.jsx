import { useId } from 'react';

export function StatusPill({ value }) {
  const tone = /risk|high|blocked/i.test(value)
    ? 'pill-bad'
    : /watch|medium|partly/i.test(value)
      ? 'pill-warn'
      : 'pill-good';
  return <span className={`pill ${tone}`}>{value}</span>;
}

export function LoadingState({ label = 'Loading…' }) {
  return <div className="card state" role="status">{label}</div>;
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="card state error-state" role="alert">
      <span>{error?.message ?? 'Something went wrong.'}</span>
      {onRetry && <button className="btn g" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function Kpi({ label, value }) {
  return <div className="kpi"><small>{label}</small><div>{value}</div></div>;
}

export function DataTable({ columns, rows, emptyMessage = 'No data' }) {
  return (
    <div className="sc">
      <table>
        <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
        <tbody>
          {rows.length ? rows.map((row, index) => (
            <tr key={row.key ?? index}>{row.cells.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
          )) : <tr><td className="mut" colSpan={columns.length}>{emptyMessage}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export function CashFlowChart({ rows }) {
  const titleId = useId();
  const max = Math.max(1, ...rows.flatMap((row) => [row.income ?? 0, row.expense ?? 0]));
  const width = 600;
  const step = (width - 42) / Math.max(1, rows.length);
  const money = (amount) => `₹${Math.round(amount).toLocaleString('en-IN')}`;

  return (
    <>
      <div className="sc">
        <svg className="cash-chart" viewBox={`0 0 ${width} 190`} role="img" aria-labelledby={titleId}>
          <title id={titleId}>Monthly income and expenses</title>
          {[0, 0.5, 1].map((fraction) => (
            <g key={fraction}>
              <line x1="0" x2={width} y1={160 - fraction * 140} y2={160 - fraction * 140} stroke="var(--bd)" />
              <text x="0" y={154 - fraction * 140} fontSize="9" fill="var(--mut)">{fraction ? money(max * fraction) : ''}</text>
            </g>
          ))}
          {rows.map((row, index) => {
            const incomeHeight = ((row.income ?? 0) / max) * 140;
            const expenseHeight = ((row.expense ?? 0) / max) * 140;
            const x = 42 + index * step + step / 2;
            return (
              <g key={`${row.m ?? row.month ?? 'month'}-${index}`}>
                <title>{`${row.m ?? row.month}: income ${money(row.income ?? 0)}, expense ${money(row.expense ?? 0)}`}</title>
                <rect x={x - 11} y={160 - incomeHeight} width="10" height={incomeHeight} rx="3" fill="var(--pri)" />
                <rect x={x + 1} y={160 - expenseHeight} width="10" height={expenseHeight} rx="3" fill="var(--acc)" />
                <text x={x} y="178" fontSize="10" textAnchor="middle" fill="var(--mut)">{row.m ?? row.month}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <small className="mut chart-legend"><span>●</span> Income &nbsp;<b>●</b> Expense</small>
    </>
  );
}

export function formatMoney(amount) {
  return `₹${Math.round(Number(amount) || 0).toLocaleString('en-IN')}`;
}

export function formatPercent(value) {
  return `${Number(value ?? 0).toFixed(1)}%`;
}

export function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase();
}

export function titleCase(value = '') {
  return String(value).replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
