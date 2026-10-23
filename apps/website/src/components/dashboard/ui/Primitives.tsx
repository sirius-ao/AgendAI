'use client';
import { useEffect, useRef, useState, type ReactNode, type SelectHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
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
import { useLocale } from '@/components/i18n/LocaleProvider';
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
  const { t } = useLocale();
  return (
    <div className="dash-page-header">
      <div>
        {eyebrow && <div className="dash-breadcrumb">{eyebrow}</div>}
        <h1>{t(title)}</h1>
        {description && <p>{t(description)}</p>}
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
  const { t } = useLocale();
  return (
    <section className={`dash-panel ${className}`}>
      {(title || action) && (
        <div className="dash-panel-heading">
          <h2>{typeof title === 'string' ? t(title) : title}</h2>
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
  const { t } = useLocale();
  return (
    <div className="dash-tabs" role="group" aria-label={t(label)}>
      {items.map((item) => (
        <button
          key={item}
          aria-pressed={value === item}
          className={value === item ? 'active' : ''}
          onClick={() => onChange(item)}
        >
          {t(item)}
        </button>
      ))}
    </div>
  );
}
export function StatusBadge({ children, tone = 'green' }: { children: ReactNode; tone?: Tone }) {
  const { t } = useLocale();
  return (
    <span className={`dash-badge ${tone}`}>
      <span />
      {typeof children === 'string' ? t(children) : children}
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
  const { t } = useLocale();
  return (
    <label className="dash-search">
      <Search size={17} />
      <span className="sr-only">{t(label || placeholder)}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t(placeholder)}
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
  const { t } = useLocale();
  return (
    <label className="dash-select">
      <span>{t(label)}</span>
      <select aria-label={t(label)} {...props}>
        {options.map((o) => (
          <option
            value={typeof o === 'string' ? o : o.value}
            key={typeof o === 'string' ? o : o.value}
          >
            {t(typeof o === 'string' ? o : o.label)}
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
  const { t } = useLocale();
  return (
    <label className="dash-field">
      <span>
        {t(label)}
        {required && <b aria-hidden="true"> *</b>}
      </span>
      {children}
      {hint && <small>{t(hint)}</small>}
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
  const { t } = useLocale();
  return (
    <label className="dash-switch-row">
      <span>
        <strong>{t(label)}</strong>
        {hint && <small>{t(hint)}</small>}
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
  const { t } = useLocale();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="dash-pagination">
      <span>
        {total
          ? `A mostrar ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} de ${total}`
          : t('Nenhum resultado')}
      </span>
      <div>
        <button
          aria-label={t('Página anterior')}
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
          aria-label={t('Página seguinte')}
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
  const { t } = useLocale();
  return (
    <div className="dash-empty">
      <Inbox />
      <h3>{t(title)}</h3>
      <p>{t(description)}</p>
      {action}
    </div>
  );
}
export function QuickActions({
  items,
}: {
  items: { label: string; icon: LucideIcon; href?: string; onClick?: () => void }[];
}) {
  const { t } = useLocale();
  return (
    <Panel title="Ações rápidas">
      <div className="dash-quick-actions">
        {items.map(({ label, icon: Icon, href, onClick }) =>
          href ? (
            <Link href={href} key={label}>
              <Icon size={19} />
              {t(label)}
            </Link>
          ) : (
            <button key={label} onClick={onClick}>
              <Icon size={19} />
              {t(label)}
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
  items: {
    label: string;
    action: () => void;
    danger?: boolean;
    icon?: LucideIcon;
    description?: string;
    separatorBefore?: boolean;
  }[];
}) {
  const { t } = useLocale();
  const ref = useRef<HTMLDetailsElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const updatePosition = () => {
    const summary = ref.current?.querySelector('summary');
    if (!summary) return;
    const rect = summary.getBoundingClientRect();
    const width = 260;
    const height = Math.min(items.length * 56 + 12, window.innerHeight - 24);
    const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12));
    const top = rect.bottom + height + 8 <= window.innerHeight
      ? rect.bottom + 4
      : Math.max(12, rect.top - height - 4);
    setPosition({ top, left });
  };
  useEffect(() => {
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!ref.current?.contains(target) && !menuRef.current?.contains(target) && ref.current) {
        ref.current.open = false;
        setOpen(false);
      }
    };
    const reposition = () => { if (ref.current?.open) updatePosition(); };
    document.addEventListener('pointerdown', close);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      document.removeEventListener('pointerdown', close);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  });
  return (
    <details
      className="dash-action-menu"
      ref={ref}
      onToggle={() => {
        const isOpen = Boolean(ref.current?.open);
        setOpen(isOpen);
        if (isOpen) updatePosition();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && ref.current) {
          ref.current.open = false;
          setOpen(false);
        }
      }}
    >
      <summary aria-label={t(label)}>
        <MoreHorizontal size={19} />
      </summary>
      {open && typeof document !== 'undefined' && createPortal(<div
        className="dash-action-menu-popover"
        ref={menuRef}
        style={{ top: position.top, left: position.left }}
      >
        {items.map((item) => (
          <button
            className={`${item.danger ? 'is-danger' : ''} ${'icon' in item && item.icon ? 'has-icon' : ''} ${'separatorBefore' in item && item.separatorBefore ? 'has-separator' : ''}`}
            key={item.label}
            onClick={() => {
              if (ref.current) ref.current.open = false;
              setOpen(false);
              item.action();
            }}
          >
            {'icon' in item && item.icon && <span className="dash-action-menu-item-icon"><item.icon size={17} strokeWidth={1.8} /></span>}
            <span className="dash-action-menu-item-copy"><strong>{t(item.label)}</strong>{'description' in item && item.description && <small>{t(item.description)}</small>}</span>
          </button>
        ))}
      </div>, document.body)}
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
  const { t } = useLocale();
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
      aria-label={t(title)}
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
          <h2>{t(title)}</h2>
          {description && <p>{t(description)}</p>}
        </div>
        <button className="dash-icon-button" aria-label={t('Fechar janela')} onClick={onClose}>
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
  const { t } = useLocale();
  return (
    <Modal title={title} onClose={onClose} className="dash-dialog-small">
      <div className="dash-modal-simple">
        <p>{description}</p>
        <div className="dash-form-actions">
          <button className="dash-btn secondary" onClick={onClose}>
            {t('Cancelar')}
          </button>
          <button
            className="dash-btn danger"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {t('Confirmar')}
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
  const { t } = useLocale();
  const [names, setNames] = useState<string[]>(initialNames);
  const [error, setError] = useState('');
  return (
    <div className="dash-attachments">
      <label>
        <Upload />
        <strong>{t('Adicionar ficheiros')}</strong>
        <small>PDF, DOC, PPT, IMAGEM (máx. {maxMB} MB)</small>
        <input
          type="file"
          multiple
          accept={accept}
          aria-label={t('Adicionar ficheiros')}
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
      <small>{t('Seleção local. Os ficheiros não são enviados nesta demonstração.')}</small>
    </div>
  );
}
