// KeywordChip - Removable keyword tag
interface KeywordChipProps {
  keyword: string;
  onRemove: () => void;
}

export function KeywordChip({ keyword, onRemove }: KeywordChipProps) {
  return (
    <span>
      {keyword}
      <button onClick={onRemove}>×</button>
    </span>
  );
}
