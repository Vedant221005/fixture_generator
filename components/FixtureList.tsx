import type { Match } from "@/lib/fixtures"

type FixtureListProps = {
  fixtures: Match[]
}

export function FixtureList({ fixtures }: FixtureListProps) {
  if (fixtures.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Not enough teams in this group to create fixtures.
      </p>
    )
  }

  return (
    <ul className="space-y-2">
      {fixtures.map((match, index) => (
        <li
          key={`${match.home}-${match.away}-${index}`}
          className="bg-muted/40 rounded-md px-3 py-2 text-sm"
        >
          <span className="font-medium">{match.home}</span>
          <span className="text-muted-foreground"> vs </span>
          <span className="font-medium">{match.away}</span>
        </li>
      ))}
    </ul>
  )
}