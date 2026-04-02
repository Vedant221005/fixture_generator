export type Team = string

export type Match = {
  home: Team
  away: Team
}

export type Group = {
  name: string
  teams: Team[]
}

export function generateFixtures(teams: Team[]): Match[] {
  const fixtures: Match[] = []

  for (let homeIndex = 0; homeIndex < teams.length; homeIndex += 1) {
    for (let awayIndex = homeIndex + 1; awayIndex < teams.length; awayIndex += 1) {
      fixtures.push({
        home: teams[homeIndex],
        away: teams[awayIndex],
      })
    }
  }

  return fixtures
}