import { Star } from 'lucide-react';
export function Stars({ value, size = 26 }: { value: number; size?: number }) {
  return (
    <div className="flex gap-[6px]">
      {[1, 2, 3].map((i) => (
        <Star key={i} size={size} fill={i <= value ? '#E8A317' : 'none'} color={i <= value ? '#E8A317' : '#D5DCE4'} />
      ))}
    </div>
  );
}
