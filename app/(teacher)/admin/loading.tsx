export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse p-2">
      <div className="h-32 bg-burgundy-950/20 rounded-3xl" />
      <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        ))}
      </div>
      <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
    </div>
  );
}
