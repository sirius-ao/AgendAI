'use client';
import { useEffect, useRef, useState, type ReactNode, type SelectHTMLAttributes } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Search,
  X,
  Upload,
  Inbox,
  type LucideIcon,
} from 'lucide-react';
import type { Tone } from '@/types/dashboard';
export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="dash-page-header">
      <div>
        {eyebrow && <div className="dash-breadcrumb">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="dash-header-actions">{actions}</div>}
    </div>
  );
}
export function Panel({
  title,
  action,
  children,
  className = '',
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`dash-panel ${className}`}>
      {(title || action) && (
        <div className="dash-panel-heading">
          <h2>{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function StatCard({
  icon: Icon,
  value,
  label,
  detail,
  tone = 'green',
  trend,
}: {
  icon: LucideIcon;
  value: ReactNode;
  label: string;
  detail?: string;
  tone?: Tone;
  trend?: string;
}) {
  return (
    <div className="dash-stat">
      <span className={`dash-icon ${tone}`}>
        <Icon />
      </span>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
        {detail && <small>{detail}</small>}
      </div>
      {trend && <span className="dash-trend">↑ {trend}</span>}
    </div>
  );
}
export function Tabs({
  items,
  value,
  onChange,
  label = 'Secções',
}: {
  items: string[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  return (
    <div className="dash-tabs" role="group" aria-label={label}>
      {items.map((item) => (
        <button
          key={item}
          aria-pressed={value === item}
          className={value === item ? 'active' : ''}
          onClick={() => onChange(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
export function StatusBadge({ children, tone = 'green' }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`dash-badge ${tone}`}>
      <span />
      {children}
    </span>
  );
}
export function SearchInput({
  value,
  onChange,
  placeholder = 'Pesquisar...',
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
}) {
  return (
    <label className="dash-search">
      <Search size={17} />
      <span className="sr-only">{label || placeholder}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type="search"
      />
    </label>
  );
}
export function SelectField({
  label,
  options,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: (string | { value: string; label: string })[];
}) {
  return (
    <label className="dash-select">
      <span>{label}</span>
      <select aria-label={label} {...props}>
        {options.map((o) => (
          <option
            value={typeof o === 'string' ? o : o.value}
            key={typeof o === 'string' ? o : o.value}
          >
            {typeof o === 'string' ? o : o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
export function Field({
  label,
  required,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="dash-field">
      <span>
        {label}
        {required && <b aria-hidden="true"> *</b>}
      </span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Switch({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="dash-switch-row">
      <span>
        <strong>{label}</strong>
        {hint && <small>{hint}</small>}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="dash-switch" aria-hidden="true" />
    </label>
  );
}
export function Avatar({ src, name, size = 34 }: { src?: string; name: string; size?: number }) {
  return src ? (
    <Image
      className="dash-avatar"
      src={src}
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      className="dash-avatar dash-initials"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {name
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')}
    </span>
  );
}
export function Pagination({
  page,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="dash-pagination">
      <span>
        {total
          ? `A mostrar ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} de ${total}`
          : 'Nenhum resultado'}
      </span>
      <div>
        <button
          aria-label="Página anterior"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft size={17} />
        </button>
        {Array.from({ length: pages }, (_, i) => i + 1)
          .filter((i) => i === 1 || i === pages || Math.abs(i - page) <= 1)
          .map((p, i, arr) => (
            <span key={p}>
              {i > 0 && p - arr[i - 1] > 1 && <span className="dash-page-gap">…</span>}
              <button
                aria-label={`Página ${p}`}
                aria-current={p === page ? 'page' : undefined}
                onClick={() => onChange(p)}
              >
                {p}
              </button>
            </span>
          ))}
        <button
          aria-label="Página seguinte"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          <ChevronRight size={17} />
        </button>
      </div>
    </div>
  );
}
export function EmptyState({
  title = 'Nenhum resultado encontrado',
  description = 'Experimente outros filtros ou crie um novo registo.',
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="dash-empty">
      <Inbox />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function QuickActions({
  items,
}: {
  items: { label: string; icon: LucideIcon; href?: string; onClick?: () => void }[];
}) {
  return (
    <Panel title="Ações rápidas">
      <div className="dash-quick-actions">
        {items.map(({ label, icon: Icon, href, onClick }) =>
          href ? (
            <Link href={href} key={label}>
              <Icon size={19} />
              {label}
            </Link>
          ) : (
            <button key={label} onClick={onClick}>
              <Icon size={19} />
              {label}
            </button>
          ),
        )}
      </div>
    </Panel>
  );
}
export function ActionMenu({
  label = 'Mais opções',
  items,
}: {
  label?: string;
  items: { label: string; action: () => void; danger?: boolean }[];
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node) && ref.current) ref.current.open = false;
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  return (
    <details
      className="dash-action-menu"
      ref={ref}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && ref.current) ref.current.open = false;
      }}
    >
      <summary aria-label={label}>
        <MoreHorizontal size={19} />
      </summary>
      <div>
        {items.map((item) => (
          <button
            className={item.danger ? 'danger' : ''}
            key={item.label}
            onClick={() => {
              if (ref.current) ref.current.open = false;
              item.action();
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </details>
  );
}
export function Modal({
  title,
  description,
  icon: Icon,
  children,
  onClose,
  className = '',
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = dialog.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className={`dash-dialog ${className}`}
      aria-label={title}
      onKeyDownCapture={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dash-modal-heading">
        {Icon && (
          <span className="dash-icon green">
            <Icon />
          </span>
        )}
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        <button className="dash-icon-button" aria-label="Fechar janela" onClick={onClose}>
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function ConfirmDialog({
  title,
  description,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose} className="dash-dialog-small">
      <div className="dash-modal-simple">
        <p>{description}</p>
        <div className="dash-form-actions">
          <button className="dash-btn secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="dash-btn danger"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            Confirmar
          </button>
        </div>
      </div>
    </Modal>
  );
}
export function Attachments({
  onChange,
  initialNames = [],
  accept = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.webp',
  maxMB = 10,
}: {
  onChange: (names: string[]) => void;
  initialNames?: string[];
  accept?: string;
  maxMB?: number;
}) {
  const [names, setNames] = useState<string[]>(initialNames);
  const [error, setError] = useState('');
  return (
    <div className="dash-attachments">
      <label>
        <Upload />
        <strong>Adicionar ficheiros</strong>
        <small>PDF, DOC, PPT, IMAGEM (máx. {maxMB} MB)</small>
        <input
          type="file"
          multiple
          accept={accept}
          aria-label="Adicionar ficheiros"
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            const extensions = accept.split(',');
            if (
              files.some(
                (f) =>
                  f.size > maxMB * 1024 * 1024 ||
                  !extensions.some((ext) => f.name.toLowerCase().endsWith(ext)),
              )
            ) {
              setError(`Escolha um formato permitido até ${maxMB} MB.`);
              e.target.value = '';
              return;
            }
            setError('');
            const next = [...new Set([...names, ...files.map((f) => f.name)])];
            setNames(next);
            onChange(next);
          }}
        />
      </label>
      {names.length > 0 && (
        <ul>
          {names.map((n) => (
            <li key={n}>
              {n}{' '}
              <button
                type="button"
                aria-label={`Remover ${n}`}
                onClick={() => {
                  const next = names.filter((name) => name !== n);
                  setNames(next);
                  onChange(next);
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="dash-error-text">
          {error}
        </p>
      )}
      <small>Seleção local. Os ficheiros não são enviados nesta demonstração.</small>
    </div>
  );
}
