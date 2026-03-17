import { SITUATION_CONFIG } from '../../lib/constants';

interface Props {
  status: string;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'sm' }: Props) {
  const config = SITUATION_CONFIG[status];
  if (!config) return null;

  const sizeClasses = size === 'sm'
    ? 'text-xs px-2 py-0.5 gap-1.5'
    : 'text-xs px-2.5 py-1 gap-1.5';

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${config.bg} ${config.text} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
