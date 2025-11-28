interface ProfileStatsProps {
  booksThisYear: number;
  totalPages: number;
  currentStreak: number;
}

export function ProfileStats({
  booksThisYear,
  totalPages,
  currentStreak,
}: ProfileStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="border rounded-lg p-6 text-center">
        <p className="text-4xl font-bold text-primary">{booksThisYear}</p>
        <p className="text-sm text-muted-foreground mt-2">Books This Year</p>
      </div>
      <div className="border rounded-lg p-6 text-center">
        <p className="text-4xl font-bold text-primary">
          {totalPages.toLocaleString()}
        </p>
        <p className="text-sm text-muted-foreground mt-2">Pages Read</p>
      </div>
      <div className="border rounded-lg p-6 text-center">
        <p className="text-4xl font-bold text-primary">{currentStreak}</p>
        <p className="text-sm text-muted-foreground mt-2">Day Streak</p>
      </div>
    </div>
  );
}
