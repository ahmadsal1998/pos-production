import { MetricCardProps } from '@/shared/constants';
import { components, typography } from '@/shared/styles/design-tokens';

const MetricCard = ({ title, value, icon, bgColor, valueColor }: MetricCardProps) => {
  // Enhanced mapping for dark mode with better color handling
  const darkBgColor = bgColor.replace('-100', '-900/50').replace('-50', '-950/50');

  return (
    <div className={`${components.card} group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-105`}>
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      
      <div className="relative flex items-center space-x-4 space-x-reverse">
        <div className={`rounded-2xl p-4 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 ${bgColor} ${valueColor} ${darkBgColor} shadow-lg`}>
          <div className="relative">
            {icon}
            {/* Subtle glow effect */}
            <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </div>
        </div>
        <div className="flex-1">
          <p className={`${typography.body.muted} mb-1 font-medium tracking-wide`}>{title}</p>
          <p className={`text-2xl font-bold transition-all duration-300 group-hover:scale-105 ${valueColor}`}>{value}</p>
          {/* Optional trend indicator */}
          <div className="mt-2 flex items-center space-x-1 space-x-reverse">
            <div className="h-1 w-6 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500" />
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">+12.5%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricCard;
