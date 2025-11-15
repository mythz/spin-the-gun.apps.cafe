interface Props {
  current: number;
  max: number;
}

export default function HealthBar({ current, max }: Props) {
  const hearts = Array.from({ length: max }, (_, i) => i < current);

  return (
    <div className="flex justify-center gap-1">
      {hearts.map((filled, i) => (
        <span key={i} className="text-xl">
          {filled ? '❤️' : '🖤'}
        </span>
      ))}
    </div>
  );
}
