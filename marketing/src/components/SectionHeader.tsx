interface Props {
  eyebrow?: string;
  title: string;
  lead?: string;
  align?: 'left' | 'center';
  light?: boolean;
}

export function SectionHeader({ eyebrow, title, lead, align = 'left', light = false }: Props) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-3xl text-center' : ''}>
      {eyebrow && <p className={`eyebrow ${light ? '!text-gold' : ''}`}>{eyebrow}</p>}
      <h2 className={`section-title ${light ? '!text-white' : ''}`}>{title}</h2>
      {lead && <p className={`section-lead ${align === 'center' ? 'mx-auto' : ''} ${light ? '!text-navy-100' : ''}`}>{lead}</p>}
    </div>
  );
}
