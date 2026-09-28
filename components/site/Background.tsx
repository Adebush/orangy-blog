export function Background() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* 底色：浅色是「浅粉 → 白」，深色是「深紫 → 黑」 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(1300px 700px at 50% -14%, var(--page-bg-2), transparent 72%), var(--page-bg)",
        }}
      />
      {/* 光斑：只用同一色系，不做彩虹 */}
      <div className="animate-blob absolute -top-52 -left-40 h-[36rem] w-[36rem] rounded-full bg-brand-300/45 blur-[140px] dark:bg-brand-600/25" />
      <div
        className="animate-blob absolute -top-32 right-[-14rem] h-[32rem] w-[32rem] rounded-full bg-brand-200/55 blur-[140px] dark:bg-violet-700/30"
        style={{ animationDelay: "-7s" }}
      />
      <div
        className="animate-blob absolute bottom-[-16rem] left-1/4 h-[32rem] w-[32rem] rounded-full bg-brand-200/35 blur-[150px] dark:bg-purple-800/35"
        style={{ animationDelay: "-14s" }}
      />
      {/* 细网格 */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)",
          backgroundSize: "58px 58px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%)",
        }}
      />
    </div>
  );
}
