interface BreadcrumbProps {
  items: { label: string; onClick?: () => void }[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center gap-2 text-sm text-slate-400 list-none m-0 p-0">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2">
            {i > 0 && <span className="text-slate-600">/</span>}
            {item.onClick ? (
              <button onClick={item.onClick} className="hover:text-white transition-colors">
                {item.label}
              </button>
            ) : (
              <span className="text-slate-300">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
