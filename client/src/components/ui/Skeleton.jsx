export default function Skeleton({ className = '', dark = false, style }) {
  return (
    <div
      className={`animate-pulse rounded-xl ${className}`}
      style={{ background: dark ? 'rgba(255,255,255,0.07)' : '#eee9f9', ...style }}
    />
  )
}

export function SkeletonStatRow({ count = 4, dark = false }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} dark={dark} className="h-[86px]" />
      ))}
    </div>
  )
}

export function SkeletonCardGrid({ count = 6, dark = false, cols = 'md:grid-cols-2 xl:grid-cols-3' }) {
  return (
    <div className={`grid grid-cols-1 ${cols} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} dark={dark} className="h-[150px]" />
      ))}
    </div>
  )
}

export function SkeletonRows({ count = 5, dark = false }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} dark={dark} className="h-[64px]" />
      ))}
    </div>
  )
}

export function SkeletonChart({ dark = false, height = 240 }) {
  return <Skeleton dark={dark} className="w-full" style={{ height }} />
}
