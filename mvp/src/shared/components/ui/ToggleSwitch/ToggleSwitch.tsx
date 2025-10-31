import { typography } from '../../../../styles/design-tokens';

export interface ToggleSwitchProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label?: string;
}

export const ToggleSwitch = ({ enabled, onChange, label }: ToggleSwitchProps) => {
  return (
    <div className="flex items-center justify-end">
      {label && <span className={`${typography.body.secondary} ml-3`}>{label}</span>}
      <button
        type="button"
        className={`${
          enabled ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-600'
        } relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 hover:shadow-md`}
        onClick={() => onChange(!enabled)}
      >
        <span
          className={`${
            enabled ? '-translate-x-6' : '-translate-x-1'
          } inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-all duration-300`}
        />
      </button>
    </div>
  );
};
