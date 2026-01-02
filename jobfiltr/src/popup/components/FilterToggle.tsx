// FilterToggle - Toggle switch for filter options
interface FilterToggleProps {
  label: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export function FilterToggle({ label, enabled, onChange }: FilterToggleProps) {
  return (
    <label>
      <input type="checkbox" checked={enabled} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
