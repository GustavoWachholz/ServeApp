interface SkeletonProps {
  rows?: number;
  cols?: number;
}

export function Skeleton({ rows = 5, cols = 3 }: SkeletonProps) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="skeleton-row">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c}>
              <span className="skeleton" style={{ width: `${60 + ((r * 13 + c * 7) % 30)}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}
