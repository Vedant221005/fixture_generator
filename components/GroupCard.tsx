import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FixtureList } from "@/components/FixtureList"
import { generateFixtures, type Group } from "@/lib/fixtures"

type GroupCardProps = {
  group: Group
}

export function GroupCard({ group }: GroupCardProps) {
  const fixtures = generateFixtures(group.teams)

  return (
    <Card className="h-full animate-in fade-in slide-in-from-bottom-2 duration-300">
      <CardHeader>
        <CardTitle>{group.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-2">
          <h3 className="text-sm font-medium">Teams</h3>
          <ul className="space-y-1">
            {group.teams.map((team) => (
              <li key={team} className="text-sm">
                {team}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-medium">Fixtures</h3>
          <FixtureList fixtures={fixtures} />
        </section>
      </CardContent>
    </Card>
  )
}