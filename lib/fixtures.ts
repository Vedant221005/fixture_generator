export type Team = string

export type Match = {
  home: Team
  away: Team
  scheduledAt: string
}

export type MatchScore = {
  homeGoals: number | null
  awayGoals: number | null
}

export type TeamStanding = {
  team: Team
  played: number
  won: number
  draw: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
}

export type Group = {
  name: string
  teams: Team[]
}

export function generateFixtures(teams: Team[], startAt?: string | Date): Match[] {
  const fixtures: Match[] = []
  const baseDate = new Date(startAt ?? Date.now())
  const matchIntervalMinutes = 120

  baseDate.setDate(baseDate.getDate() + 1)
  baseDate.setHours(18, 0, 0, 0)

  for (let homeIndex = 0; homeIndex < teams.length; homeIndex += 1) {
    for (let awayIndex = homeIndex + 1; awayIndex < teams.length; awayIndex += 1) {
      const matchIndex = fixtures.length
      fixtures.push({
        home: teams[homeIndex],
        away: teams[awayIndex],
        scheduledAt: new Date(baseDate.getTime() + matchIndex * matchIntervalMinutes * 60000).toISOString(),
      })
    }
  }

  return fixtures
}

export function formatMatchDateTime(scheduledAt: string): string {
  const date = new Date(scheduledAt)

  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  return date.toLocaleString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}
