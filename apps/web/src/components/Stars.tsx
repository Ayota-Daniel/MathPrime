import { Star } from 'lucide-react';
export function Stars({ value, size = 38 }: { value: number; size?: number }) {
  return (
    <div
      role="img"
      aria-label={`${value} étoiles sur 3`}
      className="flex gap-[6px]"
    >
      {[1, 2, 3].map((i) => (
        <Star
          key={i}
          size={size}
          fill={i <= value ? '#E8A317' : 'none'}
          color={i <= value ? '#E8A317' : '#826874'}
        />
      ))}
    </div>
  );
}
