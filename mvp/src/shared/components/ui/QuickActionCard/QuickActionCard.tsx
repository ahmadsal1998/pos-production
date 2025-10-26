import { QuickActionProps } from '../../../types';
import { animations } from '../../../styles/design-tokens';

const QuickActionCard = ({ title, icon, colorClass, path }: QuickActionProps) => {
  // Enhanced color class handling with better dark mode support
  const adaptedColorClass = colorClass.includes('bg-gray-200')
    ? `${colorClass} dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200`
    : colorClass;

  return (
    <button
      onClick={() => console.log(`Navigating to ${path}`)} // Placeholder for actual navigation
      className={`group relative flex items-center justify-center rounded-2xl p-6 text-center shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${adaptedColorClass} overflow-hidden`}
    >
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      
      <div className="relative flex flex-col items-center space-y-4">
        <div className="relative rounded-2xl p-4 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
          <div className="relative">
            {icon}
            {/* Subtle glow effect */}
            <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </div>
        </div>
        <span className="text-sm font-semibold transition-all duration-300 group-hover:scale-105">{title}</span>
      </div>
      
      {/* Animated border */}
      <div className="absolute inset-0 rounded-2xl border border-transparent bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </button>
  );
};

export default QuickActionCard;
