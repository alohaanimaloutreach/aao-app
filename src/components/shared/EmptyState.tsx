import type { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  iconColor?: string;
}

export default function EmptyState({ icon: Icon, title, description, iconColor = 'text-muted' }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-night/5 p-12 text-center" role="status">
      <div className="w-12 h-12 bg-sand rounded-2xl flex items-center justify-center mx-auto mb-3">
        <Icon className={`w-6 h-6 ${iconColor}`} strokeWidth={1.5} />
      </div>
      <p className="font-medium text-night text-sm">{title}</p>
      <p className="text-muted text-sm mt-1">{description}</p>
    </div>
  );
}
