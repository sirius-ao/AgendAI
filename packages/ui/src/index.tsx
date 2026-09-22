import type { ButtonHTMLAttributes, InputHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
export function buttonClass(
  variant: 'primary' | 'secondary' | 'outline' | 'ghost' = 'primary',
  extra = '',
) {
  return `button button-${variant} ${extra}`;
}
export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
}) {
  return <button className={buttonClass(variant, className)} {...props} />;
}
export function Container({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`container ${className}`} {...props} />;
}
export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`card ${className}`} {...props} />;
}
export function Badge({ children }: { children: ReactNode }) {
  return <span className="badge">{children}</span>;
}
export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`input ${className}`} {...props} />;
}
export function SectionHeader({
  eyebrow,
  title,
  children,
  centered = false,
}: {
  eyebrow?: string;
  title: ReactNode;
  children?: ReactNode;
  centered?: boolean;
}) {
  return (
    <div className={`section-heading ${centered ? 'centered' : ''}`}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2>{title}</h2>
      {children && <p className="muted">{children}</p>}
    </div>
  );
}
