import type { Group, Team } from "@/lib/fixtures"

export function createGroups(teams: Team[], groupSize: number): Group[] {
  if (teams.length === 0) {
    return []
  }

  const safeGroupSize = Number.isFinite(groupSize)
    ? Math.max(2, Math.floor(groupSize))
    : 3

  const groupCount = Math.ceil(teams.length / safeGroupSize)
  const baseSize = Math.floor(teams.length / groupCount)
  const remainder = teams.length % groupCount

  const groups: Group[] = []
  let cursor = 0

  for (let index = 0; index < groupCount; index += 1) {
    const size = baseSize + (index < remainder ? 1 : 0)
    groups.push({
      name: `Group ${String.fromCharCode(65 + index)}`,
      teams: teams.slice(cursor, cursor + size),
    })
    cursor += size
  }

  return groups
}