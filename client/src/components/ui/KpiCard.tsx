import type { ReactNode } from 'react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    label?: string;
  };
  color?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

const colorStyles = {
  default: 'from-zinc-800 to-zinc-900 border-zinc-700',
  success: 'from-green-900/30 to-zinc-900 border-green-800/50',
  warning: 'from-yellow-900/30 to-zinc-900 border-yellow-800/50',
  danger: 'from-red-900/30 to-zinc-900 border-red-800/50',
  info: 'from-blue-900/30 to-zinc-900 border-blue-800/50'
};

const iconColors = {
  default: 'text-orange-500',
  success: 'text-green-500',
  warning: 'text-yellow-500',
  danger: 'text-red-500',
  info: 'text-blue-500'
};

export function KpiCard({ title, value, subtitle, icon, trend, color = 'default' }: KpiCardProps) {
  return (
    <div className={`
      bg-gradient-to-br ${colorStyles[color]} 
      border rounded-xl p-4 md:p-5
    `}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs md:text-sm text-gray-400 uppercase tracking-wide truncate">
            {title}
          </p>
          <p className="text-2xl md:text-3xl font-bold text-white mt-1 truncate">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs md:text-sm text-gray-500 mt-1 truncate">{subtitle}</p>
          )}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${trend.value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              <span>{trend.value >= 0 ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
              {trend.label && <span className="text-gray-500">{trend.label}</span>}
            </div>
          )}
        </div>
        {icon && (
          <div className={`${iconColors[color]} text-2xl md:text-3xl flex-shrink-0 ml-2`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
