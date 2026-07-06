interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}

export function PageHeader({ eyebrow, title, subtitle }: PageHeaderProps) {
  return (
    <div className="mb-10 border-b border-line pb-6">
      {eyebrow && (
        <p className="mb-2 font-mono text-xs uppercase tracking-wide2 text-blueprint-600">
          {eyebrow}
        </p>
      )}
      <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h1>
      {subtitle && <p className="mt-2 max-w-2xl text-sm text-ink-muted">{subtitle}</p>}
    </div>
  );
}
