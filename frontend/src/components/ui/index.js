import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon';

export { Icon };

const cx = (...c) => c.filter(Boolean).join(' ');

/* ---------- Button ---------- */
export function Button({
  variant = 'secondary', size, block, icon, iconRight, loading, children, className, type = 'button', ...rest
}) {
  return (
    <button
      type={type}
      className={cx('btn', `btn-${variant}`, size && `btn-${size}`, block && 'btn-block', !children && 'btn-icon', className)}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading ? <span className="spinner" /> : icon && <Icon name={icon} size={size === 'sm' ? 14 : 16} />}
      {children}
      {iconRight && !loading && <Icon name={iconRight} size={size === 'sm' ? 14 : 16} />}
    </button>
  );
}

/* ---------- Layout bits ---------- */
export function PageHeader({ eyebrow, title, description, actions, back }) {
  const navigate = useNavigate();
  return (
    <>
      {back && (
        <button className="back-link" onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}>
          <Icon name="chevronLeft" size={14} /> Back
        </button>
      )}
      <div className="page-head">
        <div>
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        {actions && <div className="page-head-actions">{actions}</div>}
      </div>
    </>
  );
}

export function Card({ title, description, actions, children, footer, pad = true, className, ...rest }) {
  return (
    <div className={cx('card', className)} {...rest}>
      {(title || actions) && (
        <div className="card-head">
          <div>
            {title && <h2>{title}</h2>}
            {description && <p>{description}</p>}
          </div>
          {actions && <div className="row">{actions}</div>}
        </div>
      )}
      {pad ? <div className="card-body">{children}</div> : children}
      {footer && <div className="card-foot">{footer}</div>}
    </div>
  );
}

export function Stat({ label, value, icon, note, loading }) {
  return (
    <div className="card stat">
      <div className="stat-label">{icon && <Icon name={icon} size={14} />}{label}</div>
      {loading ? <Skeleton w={56} h={30} style={{ marginTop: 8 }} /> : <div className="stat-value">{value}</div>}
      {note && <div className="stat-note">{note}</div>}
    </div>
  );
}

export function Badge({ tone, dot, children, className }) {
  return (
    <span className={cx('badge', tone && `badge-${tone}`, className)}>
      {dot && <span className="dot" />}
      {children}
    </span>
  );
}

export function Progress({ value = 0, tone, size, label }) {
  const v = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  return (
    <div className={cx('progress', tone, size === 'sm' && 'progress-sm')} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <span style={{ width: `${v}%` }} />
    </div>
  );
}

export function Ring({ value = 0, size = 96, stroke = 8, tone = 'accent', label }) {
  const v = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = tone === 'success' ? 'var(--success)' : tone === 'danger' ? 'var(--danger)' : tone === 'warning' ? 'var(--warning)' : 'var(--accent)';
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (v / 100) * c} style={{ transition: 'stroke-dashoffset 700ms var(--ease)' }}
        />
      </svg>
      <span className="ring-label" style={{ fontSize: size * 0.24 }}>{label ?? `${v}%`}</span>
    </div>
  );
}

/* ---------- States ---------- */
export function Spinner({ size }) {
  return <span className="spinner" style={size ? { width: size, height: size } : undefined} />;
}

export function Loading({ label = 'Loading…' }) {
  return <div className="loading-block"><Spinner /> {label}</div>;
}

export function Skeleton({ w = '100%', h = 14, r, style }) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

export function SkeletonRows({ rows = 3 }) {
  return (
    <div className="stack" style={{ padding: 20 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="stack-sm">
          <Skeleton w={`${60 - i * 8}%`} h={14} />
          <Skeleton w="90%" h={10} />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon = 'sparkles', title, description, action }) {
  return (
    <div className="empty fade-in">
      <div className="empty-icon"><Icon name={icon} size={20} /></div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

export function Alert({ tone = 'info', children, onClose }) {
  const icon = tone === 'danger' ? 'alert' : tone === 'success' ? 'checkCircle' : tone === 'warning' ? 'alert' : 'info';
  return (
    <div className={`alert alert-${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon name={icon} size={15} />
      <div className="grow">{children}</div>
      {onClose && (
        <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose} aria-label="Dismiss" style={{ color: 'inherit', marginTop: -4 }}>
          <Icon name="x" size={14} />
        </button>
      )}
    </div>
  );
}

/* ---------- Forms ---------- */
export function Field({ label, hint, error, optional, children, className }) {
  return (
    <label className={cx('field', className)}>
      {label && <span className="label">{label}{optional && <span className="opt"> (optional)</span>}</span>}
      {children}
      {error ? <span className="error-text">{error}</span> : hint && <span className="hint">{hint}</span>}
    </label>
  );
}

export const Input = React.forwardRef(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cx('input', className)} {...p} />;
});
export const Textarea = React.forwardRef(function Textarea({ className, ...p }, ref) {
  return <textarea ref={ref} className={cx('textarea', className)} {...p} />;
});
export function Select({ className, children, ...p }) {
  return <select className={cx('select', className)} {...p}>{children}</select>;
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => {
        const id = typeof t === 'string' ? t : t.value;
        const lbl = typeof t === 'string' ? t : t.label;
        return (
          <button key={id} role="tab" aria-selected={value === id} className={cx('tab', value === id && 'active')} onClick={() => onChange(id)}>
            {lbl}
          </button>
        );
      })}
    </div>
  );
}

export function Segmented({ options, value, onChange }) {
  return (
    <div className="segmented">
      {options.map((o) => {
        const id = typeof o === 'string' ? o : o.value;
        const lbl = typeof o === 'string' ? o : o.label;
        return <button key={id} type="button" className={value === id ? 'active' : ''} onClick={() => onChange(id)}>{lbl}</button>;
      })}
    </div>
  );
}

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, description, children, footer, size }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={cx('modal', size === 'lg' && 'modal-lg')} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}>
        <div className="modal-head">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <Button variant="ghost" size="sm" icon="x" onClick={onClose} aria-label="Close" />
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

/** Promise-free confirm dialog. */
export function ConfirmDialog({ open, title, description, confirmLabel = 'Delete', danger = true, loading, onConfirm, onCancel }) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant={danger ? 'danger-solid' : 'primary'} loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      <p>{description}</p>
    </Modal>
  );
}

/* ---------- Dropdown ---------- */
export function Dropdown({ trigger, children, align = 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <div className="dropdown" ref={ref}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div className="menu" style={align === 'left' ? { left: 0, right: 'auto' } : undefined} onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}

export function Avatar({ name = '', src, size }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('') || '?';
  return <div className={cx('avatar', size === 'lg' && 'avatar-lg')}>{src ? <img src={src} alt="" /> : initials}</div>;
}

/* ---------- Simple markdown renderer for AI text ---------- */
function inlineMd(s) {
  // **bold** and `code`
  return String(s).split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) return <code key={i} className="inline-code">{part.slice(1, -1)}</code>;
    return part;
  });
}

export function Prose({ text }) {
  if (!text) return null;
  const lines = String(text).replace(/\r/g, '').split('\n');
  const out = [];
  let list = null;
  let code = null;
  let k = 0;
  const key = () => `b${k++}`;
  const flush = () => { if (list) { out.push(list.ordered ? <ol key={key()}>{list.items}</ol> : <ul key={key()}>{list.items}</ul>); list = null; } };
  lines.forEach((raw) => {
    if (code) {
      if (raw.trim().startsWith('```')) { out.push(<pre key={key()} className="code-block"><code>{code.join('\n')}</code></pre>); code = null; }
      else code.push(raw);
      return;
    }
    const line = raw.trim();
    if (line.startsWith('```')) { flush(); code = []; return; }
    if (!line) { flush(); return; }
    const h = line.match(/^#{1,4}\s+(.*)/);
    const ul = line.match(/^[-*•]\s+(.*)/);
    const ol = line.match(/^\d+[.)]\s+(.*)/);
    if (h) { flush(); out.push(<h3 key={key()}>{inlineMd(h[1])}</h3>); }
    else if (ul || ol) {
      const ordered = !!ol;
      if (!list || list.ordered !== ordered) { flush(); list = { ordered, items: [] }; }
      list.items.push(<li key={key()}>{inlineMd((ul || ol)[1])}</li>);
    } else { flush(); out.push(<p key={key()}>{inlineMd(line)}</p>); }
  });
  if (code) out.push(<pre key={key()} className="code-block"><code>{code.join('\n')}</code></pre>);
  flush();
  return <div className="prose">{out}</div>;
}

/** Parse a JSON column safely. */
export function parseDetails(v) {
  if (!v) return {};
  if (typeof v === 'object') return v;
  try { return JSON.parse(v) || {}; } catch { return {}; }
}

export function formatMinutes(min) {
  const m = Math.round(Number(min) || 0);
  if (!m) return '';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

export function formatDate(d, opts) {
  if (!d) return '';
  // Date-only strings ("2026-10-30") are calendar dates, not UTC instants.
  const m = typeof d === 'string' && d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(d);
  if (isNaN(date)) return '';
  return date.toLocaleDateString(undefined, opts || { month: 'short', day: 'numeric', year: 'numeric' });
}

export function timeAgo(d) {
  if (!d) return '';
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (isNaN(s)) return '';
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return formatDate(d);
}
