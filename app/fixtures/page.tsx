"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Copy, Trophy, X } from "lucide-react"

import {
  generateFixtures,
  type Group,
  type Match,
  type MatchScore,
  type Team,
  type TeamStanding,
} from "@/lib/fixtures"

const STORAGE_KEY = "fixture-generator-data"

type FixturePayload = {
  teams: Team[]
  groupSize: number
  groups: Group[]
  generatedAt: string
  matchScores: Record<string, MatchScore>
  knockoutScores: Record<string, MatchScore>
}

type KnockoutRound = "quarterfinal" | "semifinal" | "final"

type KnockoutMatch = {
  id: string
  round: KnockoutRound
  label: string
  home: Team | null
  away: Team | null
}

type QualifiedTeam = {
  team: Team
  groupName: string
  points: number
  goalDifference: number
  goalsFor: number
}

function getMatchKey(groupName: string, match: Match): string {
  return `${groupName}::${match.home}::${match.away}`
}

function getKnockoutMatchKey(round: KnockoutRound, id: string): string {
  return `knockout::${round}::${id}`
}

function compareStandings(a: TeamStanding, b: TeamStanding): number {
  if (b.points !== a.points) {
    return b.points - a.points
  }

  if (b.goalDifference !== a.goalDifference) {
    return b.goalDifference - a.goalDifference
  }

  if (b.goalsFor !== a.goalsFor) {
    return b.goalsFor - a.goalsFor
  }

  return a.team.localeCompare(b.team)
}

function buildShareText(
  groups: Group[],
): string {
  const header = ["🏆 FIXTURE GENERATOR", "📅 Match Schedule"]

  const groupSections = groups.map((group) => {
    const lines: string[] = [`📍 ${group.name}`, "👥 Teams:"]
    group.teams.forEach((team) => lines.push(`- ${team}`))

    const fixtures = generateFixtures(group.teams)
    lines.push("⚽ Fixtures:")

    if (fixtures.length === 0) {
      lines.push("- Not enough teams")
    } else {
      fixtures.forEach((match) => {
        lines.push(`- ${match.home} vs ${match.away}`)
      })
    }

    return lines.join("\n")
  })

  return [...header, ...groupSections].join("\n\n")
}

function computeStandings(group: Group, fixtures: Match[], matchScores: Record<string, MatchScore>): TeamStanding[] {
  const table: Record<string, TeamStanding> = {}

  group.teams.forEach((team) => {
    table[team] = {
      team,
      played: 0,
      won: 0,
      draw: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    }
  })

  fixtures.forEach((match) => {
    const score = matchScores[getMatchKey(group.name, match)]
    if (!score || score.homeGoals === null || score.awayGoals === null) {
      return
    }

    const home = table[match.home]
    const away = table[match.away]

    if (!home || !away) {
      return
    }

    home.played += 1
    away.played += 1

    home.goalsFor += score.homeGoals
    home.goalsAgainst += score.awayGoals
    away.goalsFor += score.awayGoals
    away.goalsAgainst += score.homeGoals

    if (score.homeGoals > score.awayGoals) {
      home.won += 1
      away.lost += 1
      home.points += 3
      return
    }

    if (score.homeGoals < score.awayGoals) {
      away.won += 1
      home.lost += 1
      away.points += 3
      return
    }

    home.draw += 1
    away.draw += 1
    home.points += 1
    away.points += 1
  })

  return Object.values(table)
    .map((entry) => ({
      ...entry,
      goalDifference: entry.goalsFor - entry.goalsAgainst,
    }))
    .sort(compareStandings)
}

function computeOverallStandings(groups: Group[], matchScores: Record<string, MatchScore>): TeamStanding[] {
  const table: Record<string, TeamStanding> = {}

  groups.forEach((group) => {
    group.teams.forEach((team) => {
      if (table[team]) {
        return
      }

      table[team] = {
        team,
        played: 0,
        won: 0,
        draw: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      }
    })

    const fixtures = generateFixtures(group.teams)

    fixtures.forEach((match) => {
      const score = matchScores[getMatchKey(group.name, match)]
      if (!score || score.homeGoals === null || score.awayGoals === null) {
        return
      }

      const home = table[match.home]
      const away = table[match.away]

      if (!home || !away) {
        return
      }

      home.played += 1
      away.played += 1

      home.goalsFor += score.homeGoals
      home.goalsAgainst += score.awayGoals
      away.goalsFor += score.awayGoals
      away.goalsAgainst += score.homeGoals

      if (score.homeGoals > score.awayGoals) {
        home.won += 1
        away.lost += 1
        home.points += 3
        return
      }

      if (score.homeGoals < score.awayGoals) {
        away.won += 1
        home.lost += 1
        away.points += 3
        return
      }

      home.draw += 1
      away.draw += 1
      home.points += 1
      away.points += 1
    })
  })

  return Object.values(table)
    .map((entry) => ({
      ...entry,
      goalDifference: entry.goalsFor - entry.goalsAgainst,
    }))
    .sort(compareStandings)
}

function isGroupStageComplete(groups: Group[], matchScores: Record<string, MatchScore>): boolean {
  for (const group of groups) {
    const fixtures = generateFixtures(group.teams)

    for (const match of fixtures) {
      const score = matchScores[getMatchKey(group.name, match)]
      if (!score || score.homeGoals === null || score.awayGoals === null) {
        return false
      }
    }
  }

  return true
}

function applyMatchResult(
  table: Record<string, TeamStanding>,
  home: Team | null,
  away: Team | null,
  score?: MatchScore,
): void {
  if (!home || !away || !score) {
    return
  }

  if (score.homeGoals === null || score.awayGoals === null) {
    return
  }

  const homeRow = table[home]
  const awayRow = table[away]

  if (!homeRow || !awayRow) {
    return
  }

  homeRow.played += 1
  awayRow.played += 1
  homeRow.goalsFor += score.homeGoals
  homeRow.goalsAgainst += score.awayGoals
  awayRow.goalsFor += score.awayGoals
  awayRow.goalsAgainst += score.homeGoals

  if (score.homeGoals > score.awayGoals) {
    homeRow.won += 1
    awayRow.lost += 1
    homeRow.points += 3
    return
  }

  if (score.homeGoals < score.awayGoals) {
    awayRow.won += 1
    homeRow.lost += 1
    awayRow.points += 3
    return
  }

  homeRow.draw += 1
  awayRow.draw += 1
  homeRow.points += 1
  awayRow.points += 1
}

function computeTournamentStandings(
  groups: Group[],
  matchScores: Record<string, MatchScore>,
  knockoutScores: Record<string, MatchScore>,
  includeKnockout: boolean,
): TeamStanding[] {
  const table: Record<string, TeamStanding> = {}

  groups.forEach((group) => {
    group.teams.forEach((team) => {
      if (table[team]) {
        return
      }

      table[team] = {
        team,
        played: 0,
        won: 0,
        draw: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      }
    })

    generateFixtures(group.teams).forEach((match) => {
      applyMatchResult(table, match.home, match.away, matchScores[getMatchKey(group.name, match)])
    })
  })

  const currentStandings = Object.values(table)
    .map((entry) => ({
      ...entry,
      goalDifference: entry.goalsFor - entry.goalsAgainst,
    }))
    .sort(compareStandings)

  if (!includeKnockout) {
    return currentStandings
  }

  const knockoutStage = buildKnockoutBracket(groups, matchScores, currentStandings, knockoutScores)

  knockoutStage.quarterfinals.forEach((match) => {
    applyMatchResult(table, match.home, match.away, knockoutScores[getKnockoutMatchKey(match.round, match.id)])
  })

  knockoutStage.semifinals.forEach((match) => {
    applyMatchResult(table, match.home, match.away, knockoutScores[getKnockoutMatchKey(match.round, match.id)])
  })

  if (knockoutStage.final) {
    applyMatchResult(
      table,
      knockoutStage.final.home,
      knockoutStage.final.away,
      knockoutScores[getKnockoutMatchKey(knockoutStage.final.round, knockoutStage.final.id)],
    )
  }

  return Object.values(table)
    .map((entry) => ({
      ...entry,
      goalDifference: entry.goalsFor - entry.goalsAgainst,
    }))
    .sort(compareStandings)
}

function getGroupRankings(groups: Group[], matchScores: Record<string, MatchScore>) {
  return groups.map((group) => ({
    name: group.name,
    standings: computeStandings(group, generateFixtures(group.teams), matchScores),
  }))
}

function toQualifiedTeam(groupName: string, standing: TeamStanding): QualifiedTeam {
  return {
    team: standing.team,
    groupName,
    points: standing.points,
    goalDifference: standing.goalDifference,
    goalsFor: standing.goalsFor,
  }
}

function compareQualified(a: QualifiedTeam, b: QualifiedTeam): number {
  if (b.points !== a.points) {
    return b.points - a.points
  }

  if (b.goalDifference !== a.goalDifference) {
    return b.goalDifference - a.goalDifference
  }

  if (b.goalsFor !== a.goalsFor) {
    return b.goalsFor - a.goalsFor
  }

  return a.team.localeCompare(b.team)
}

function createCrossGroupQuarterfinals(teams: QualifiedTeam[]): KnockoutMatch[] {
  const seeded = [...teams].sort(compareQualified)
  const available = [...seeded]
  const quarterfinals: KnockoutMatch[] = []

  for (let matchNumber = 1; matchNumber <= 4; matchNumber += 1) {
    if (available.length < 2) {
      break
    }

    const home = available.shift()
    if (!home) {
      break
    }

    let awayIndex = available.length - 1
    while (awayIndex >= 0 && available[awayIndex].groupName === home.groupName) {
      awayIndex -= 1
    }

    if (awayIndex < 0) {
      awayIndex = available.length - 1
    }

    const [away] = available.splice(awayIndex, 1)
    if (!away) {
      break
    }

    quarterfinals.push({
      id: `qf${matchNumber}`,
      round: "quarterfinal",
      label: `Quarter Final ${matchNumber}`,
      home: home.team,
      away: away.team,
    })
  }

  return quarterfinals
}

function selectQuarterfinalTeams(groups: Group[], matchScores: Record<string, MatchScore>, totalTeams: number): QualifiedTeam[] {
  const groupRankings = getGroupRankings(groups, matchScores)
  const groupMap = new Map(groupRankings.map((item) => [item.name, item]))

  if (totalTeams === 12 && groupRankings.length >= 4) {
    const [a, b, c, d] = groupRankings
    const selected: QualifiedTeam[] = []

    if (a.standings[0]) selected.push(toQualifiedTeam(a.name, a.standings[0]))
    if (a.standings[1]) selected.push(toQualifiedTeam(a.name, a.standings[1]))
    if (b.standings[0]) selected.push(toQualifiedTeam(b.name, b.standings[0]))
    if (b.standings[1]) selected.push(toQualifiedTeam(b.name, b.standings[1]))
    if (c.standings[0]) selected.push(toQualifiedTeam(c.name, c.standings[0]))
    if (c.standings[1]) selected.push(toQualifiedTeam(c.name, c.standings[1]))
    if (d.standings[0]) selected.push(toQualifiedTeam(d.name, d.standings[0]))
    if (d.standings[1]) selected.push(toQualifiedTeam(d.name, d.standings[1]))

    return selected.slice(0, 8)
  }

  if (totalTeams === 22 || totalTeams === 24) {
    return groupRankings
      .slice(0, 8)
      .map((group) => (group.standings[0] ? toQualifiedTeam(group.name, group.standings[0]) : null))
      .filter((team): team is QualifiedTeam => Boolean(team))
  }

  if (totalTeams === 16) {
    const winners = groupRankings
      .map((group) => (group.standings[0] ? toQualifiedTeam(group.name, group.standings[0]) : null))
      .filter((team): team is QualifiedTeam => Boolean(team))

    const runnerUps = groupRankings
      .map((group) => (group.standings[1] ? toQualifiedTeam(group.name, group.standings[1]) : null))
      .filter((team): team is QualifiedTeam => Boolean(team))
      .sort(compareQualified)

    return [...winners, ...runnerUps.slice(0, Math.max(0, 8 - winners.length))].slice(0, 8)
  }

  const winners = groupRankings
    .map((group) => (group.standings[0] ? toQualifiedTeam(group.name, group.standings[0]) : null))
    .filter((team): team is QualifiedTeam => Boolean(team))

  const extraCandidates = groupRankings
    .flatMap((group) =>
      group.standings
        .slice(1)
        .map((standing) => toQualifiedTeam(group.name, standing)),
    )
    .sort(compareQualified)

  return [...winners, ...extraCandidates].slice(0, 8)
}

function getWinnerFromScore(home: Team | null, away: Team | null, score?: MatchScore): Team | null {
  if (home && !away) {
    return home
  }

  if (!home && away) {
    return away
  }

  if (!home || !away || !score) {
    return null
  }

  if (score.homeGoals === null || score.awayGoals === null) {
    return null
  }

  if (score.homeGoals > score.awayGoals) {
    return home
  }

  if (score.homeGoals < score.awayGoals) {
    return away
  }

  return null
}

function buildKnockoutBracket(
  groups: Group[],
  matchScores: Record<string, MatchScore>,
  standings: TeamStanding[],
  knockoutScores: Record<string, MatchScore>,
): {
  qualified: TeamStanding[]
  quarterfinals: KnockoutMatch[]
  semifinals: KnockoutMatch[]
  final: KnockoutMatch | null
} {
  const qualified = standings
  const totalTeams = standings.length

  if (qualified.length < 2) {
    return {
      qualified,
      quarterfinals: [],
      semifinals: [],
      final: null,
    }
  }

  const resolveWinner = (round: KnockoutRound, id: string, home: Team | null, away: Team | null): Team | null => {
    if (home && !away) {
      return home
    }

    if (!home && away) {
      return away
    }

    return getWinnerFromScore(home, away, knockoutScores[getKnockoutMatchKey(round, id)])
  }

  if (qualified.length === 2) {
    return {
      qualified,
      quarterfinals: [],
      semifinals: [],
      final: {
        id: "final",
        round: "final",
        label: "Final",
        home: qualified[0]?.team ?? null,
        away: qualified[1]?.team ?? null,
      },
    }
  }

  if (qualified.length <= 4) {
    const sfSlots: Array<{ id: string; home: Team | null; away: Team | null; label: string }> = [
      {
        id: "sf1",
        label: "Semi Final 1",
        home: qualified[0]?.team ?? null,
        away: qualified[3]?.team ?? null,
      },
      {
        id: "sf2",
        label: "Semi Final 2",
        home: qualified[1]?.team ?? null,
        away: qualified[2]?.team ?? null,
      },
    ]

    const semifinals = sfSlots.filter((match) => match.home || match.away).map((match) => ({
      id: match.id,
      round: "semifinal" as const,
      label: match.label,
      home: match.home,
      away: match.away,
    }))

    const sfWinners = sfSlots.map((match) => resolveWinner("semifinal", match.id, match.home, match.away))

    return {
      qualified,
      quarterfinals: [],
      semifinals,
      final: {
        id: "final",
        round: "final",
        label: "Final",
        home: sfWinners[0] ?? null,
        away: sfWinners[1] ?? null,
      },
    }
  }

  if (qualified.length === 6) {
    const sfSlots: Array<{ id: string; home: Team | null; away: Team | null; label: string }> = [
      {
        id: "sf1",
        label: "Semi Final 1",
        home: qualified[0]?.team ?? null,
        away: qualified[3]?.team ?? null,
      },
      {
        id: "sf2",
        label: "Semi Final 2",
        home: qualified[1]?.team ?? null,
        away: qualified[2]?.team ?? null,
      },
    ]

    const semifinals = sfSlots.map((match) => ({
      id: match.id,
      round: "semifinal" as const,
      label: match.label,
      home: match.home,
      away: match.away,
    }))

    const sfWinners = sfSlots.map((match) => resolveWinner("semifinal", match.id, match.home, match.away))

    return {
      qualified,
      quarterfinals: [],
      semifinals,
      final: {
        id: "final",
        round: "final",
        label: "Final",
        home: sfWinners[0] ?? null,
        away: sfWinners[1] ?? null,
      },
    }
  }

  const qfQualified = selectQuarterfinalTeams(groups, matchScores, totalTeams)

  let quarterfinals: KnockoutMatch[] = []
  if (totalTeams === 12 && qfQualified.length === 8) {
    const [a1, a2, b1, b2, c1, c2, d1, d2] = qfQualified
    quarterfinals = [
      {
        id: "qf1",
        round: "quarterfinal",
        label: "Quarter Final 1",
        home: a1?.team ?? null,
        away: b2?.team ?? null,
      },
      {
        id: "qf2",
        round: "quarterfinal",
        label: "Quarter Final 2",
        home: b1?.team ?? null,
        away: a2?.team ?? null,
      },
      {
        id: "qf3",
        round: "quarterfinal",
        label: "Quarter Final 3",
        home: c1?.team ?? null,
        away: d2?.team ?? null,
      },
      {
        id: "qf4",
        round: "quarterfinal",
        label: "Quarter Final 4",
        home: d1?.team ?? null,
        away: c2?.team ?? null,
      },
    ]
  } else {
    quarterfinals = createCrossGroupQuarterfinals(qfQualified)
  }

  const qfWinners = quarterfinals.map((match) => resolveWinner("quarterfinal", match.id, match.home, match.away))

  const semifinals: KnockoutMatch[] = [
    {
      id: "sf1",
      round: "semifinal",
      label: "Semi Final 1",
      home: qfWinners[0] ?? null,
      away: qfWinners[1] ?? null,
    },
    {
      id: "sf2",
      round: "semifinal",
      label: "Semi Final 2",
      home: qfWinners[2] ?? null,
      away: qfWinners[3] ?? null,
    },
  ]

  const sfWinners = semifinals.map((match) => resolveWinner("semifinal", match.id, match.home, match.away))

  const final: KnockoutMatch = {
    id: "final",
    round: "final",
    label: "Final",
    home: sfWinners[0] ?? null,
    away: sfWinners[1] ?? null,
  }

  return {
    qualified,
    quarterfinals,
    semifinals,
    final,
  }
}

export default function FixturesPage() {
  const [fixtureData, setFixtureData] = useState<FixturePayload | null>(null)
  const [copied, setCopied] = useState(false)
  const [isTableOpen, setIsTableOpen] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return
    }

    try {
      const parsed = JSON.parse(raw) as FixturePayload
      const teams = Array.isArray(parsed.teams) ? parsed.teams : []
      const groups = Array.isArray(parsed.groups) ? parsed.groups : []
      const groupSize = typeof parsed.groupSize === "number" ? parsed.groupSize : 3
      const generatedAt = typeof parsed.generatedAt === "string" ? parsed.generatedAt : new Date().toISOString()
      const matchScores =
        parsed.matchScores && typeof parsed.matchScores === "object" ? parsed.matchScores : {}
      const knockoutScores =
        parsed.knockoutScores && typeof parsed.knockoutScores === "object" ? parsed.knockoutScores : {}

      setFixtureData({
        teams,
        groups,
        groupSize,
        generatedAt,
        matchScores,
        knockoutScores,
      })
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const hasResult = Boolean(fixtureData && fixtureData.groups.length > 0)

  const groupsWithFixtures = useMemo(() => {
    return (fixtureData?.groups ?? []).map((group) => ({
      ...group,
      fixtures: generateFixtures(group.teams),
    }))
  }, [fixtureData])

  const groupStageStandings = useMemo(() => {
    return computeOverallStandings(fixtureData?.groups ?? [], fixtureData?.matchScores ?? {})
  }, [fixtureData])

  const groupStageComplete = useMemo(() => {
    return isGroupStageComplete(fixtureData?.groups ?? [], fixtureData?.matchScores ?? {})
  }, [fixtureData])

  const overallStandings = useMemo(() => {
    return computeTournamentStandings(
      fixtureData?.groups ?? [],
      fixtureData?.matchScores ?? {},
      fixtureData?.knockoutScores ?? {},
      groupStageComplete,
    )
  }, [fixtureData, groupStageComplete])

  const knockoutStage = useMemo(() => {
    if (!groupStageComplete) {
      return {
        qualified: [],
        quarterfinals: [],
        semifinals: [],
        final: null,
      }
    }

    return buildKnockoutBracket(
      fixtureData?.groups ?? [],
      fixtureData?.matchScores ?? {},
      groupStageStandings,
      fixtureData?.knockoutScores ?? {},
    )
  }, [groupStageComplete, groupStageStandings, fixtureData])

  const generatedLabel = useMemo(() => {
    if (!fixtureData?.generatedAt) {
      return "-"
    }

    const date = new Date(fixtureData.generatedAt)
    if (Number.isNaN(date.getTime())) {
      return "-"
    }

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    })
  }, [fixtureData])

  const handleCopy = async () => {
    if (!hasResult) {
      return
    }

    const text = buildShareText(fixtureData?.groups ?? [])
    await navigator.clipboard.writeText(text)
    setCopied(true)
  }

  const handleGoalChange = (
    groupName: string,
    match: Match,
    side: "homeGoals" | "awayGoals",
    value: string,
  ) => {
    if (!fixtureData) {
      return
    }

    const key = getMatchKey(groupName, match)
    const parsed = value === "" ? null : Number(value)
    const safeValue = parsed === null || Number.isNaN(parsed) ? null : Math.max(0, Math.floor(parsed))

    const previous = fixtureData.matchScores[key] ?? { homeGoals: null, awayGoals: null }
    const nextScores = {
      ...fixtureData.matchScores,
      [key]: {
        ...previous,
        [side]: safeValue,
      },
    }

    const nextPayload: FixturePayload = {
      ...fixtureData,
      matchScores: nextScores,
    }

    setFixtureData(nextPayload)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPayload))
  }

  const handleKnockoutGoalChange = (
    round: KnockoutRound,
    match: KnockoutMatch,
    side: "homeGoals" | "awayGoals",
    value: string,
  ) => {
    if (!fixtureData) {
      return
    }

    const key = getKnockoutMatchKey(round, match.id)
    const parsed = value === "" ? null : Number(value)
    const safeValue = parsed === null || Number.isNaN(parsed) ? null : Math.max(0, Math.floor(parsed))

    const previous = fixtureData.knockoutScores[key] ?? { homeGoals: null, awayGoals: null }
    const nextScores = {
      ...fixtureData.knockoutScores,
      [key]: {
        ...previous,
        [side]: safeValue,
      },
    }

    const nextPayload: FixturePayload = {
      ...fixtureData,
      knockoutScores: nextScores,
    }

    setFixtureData(nextPayload)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPayload))
  }

  const renderKnockoutMatch = (match: KnockoutMatch) => {
    const score = fixtureData?.knockoutScores[getKnockoutMatchKey(match.round, match.id)]
    const winner = getWinnerFromScore(match.home, match.away, score)
    const isDisabled = !match.home || !match.away

    return (
      <div
        key={match.id}
        className="glass-panel flex flex-col gap-4 rounded-2xl p-4 transition hover:border-[#6bff8f]/40 md:p-6"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6bff8f]">{match.label}</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ababa8]">
            {winner ? `Winner: ${winner}` : "Pending"}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 flex-1 truncate font-semibold">{match.home ?? "TBD"}</span>

          <div className="flex items-center gap-2 px-2 text-center">
            <input
              type="number"
              min={0}
              inputMode="numeric"
              disabled={isDisabled}
              value={score?.homeGoals ?? ""}
              onChange={(event) => handleKnockoutGoalChange(match.round, match, "homeGoals", event.target.value)}
              className="h-9 w-14 rounded-md border border-[#474846] bg-black px-2 text-center text-sm font-bold text-[#faf9f5] outline-none transition focus:border-[#6bff8f]/40 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={`${match.home ?? "Home"} goals`}
            />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#ababa8]">:</span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              disabled={isDisabled}
              value={score?.awayGoals ?? ""}
              onChange={(event) => handleKnockoutGoalChange(match.round, match, "awayGoals", event.target.value)}
              className="h-9 w-14 rounded-md border border-[#474846] bg-black px-2 text-center text-sm font-bold text-[#faf9f5] outline-none transition focus:border-[#6bff8f]/40 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={`${match.away ?? "Away"} goals`}
            />
          </div>

          <span className="min-w-0 flex-1 truncate text-right font-semibold">{match.away ?? "TBD"}</span>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-[#0d0f0d] text-[#faf9f5] selection:bg-[#6bff8f] selection:text-[#005f28]">
        <header className="sticky top-0 z-30 border-b border-[#1e201d] bg-[#0d0f0d]/95 shadow-[0_0_40px_rgba(107,255,143,0.08)] backdrop-blur">
          <div className="mx-auto flex w-full max-w-screen-2xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-[#6bff8f] text-[#005f28]">
                <Trophy className="size-5" />
              </div>
              <p className="text-2xl font-black uppercase tracking-tight text-[#6bff8f]">
                Fixture Generator
              </p>
            </Link>
            <nav className="hidden items-center gap-8 text-sm font-bold uppercase tracking-wide md:flex">
              <span className="border-b-2 border-[#6bff8f] pb-1 text-[#6bff8f]">Fixtures</span>
            </nav>
          </div>
        </header>

        <main>
          <section className="relative overflow-hidden px-6 pb-0 pt-0">
            <div className="pitch-texture absolute inset-0 opacity-40" />
            <div className="pointer-events-none absolute left-1/2 top-0 h-100 w-200 -translate-x-1/2 rounded-full bg-[#6bff8f]/10 blur-[120px]" />
          </section>

          <section className="mx-auto max-w-7xl px-6 pb-24">
            <div className="mb-12 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-3xl font-black uppercase tracking-tight text-white">Matchday Schedule</h3>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-[#6bff8f]">
                  Generated: {generatedLabel}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsTableOpen(true)}
                  disabled={!hasResult}
                  className="flex items-center gap-2 rounded-full border border-[#474846] bg-[#242623] px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#faf9f5] transition hover:bg-[#6bff8f]/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Table
                </button>

                <button
                  onClick={handleCopy}
                  disabled={!hasResult}
                  className="flex items-center gap-2 rounded-full border border-[#474846] bg-[#242623] px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#faf9f5] transition hover:bg-[#6bff8f]/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Copy className="size-4" />
                  {copied ? "Copied" : "Copy Fixtures"}
                </button>
              </div>
            </div>

            {!hasResult ? (
              <div className="rounded-[2rem] border border-dashed border-[#474846] bg-[#121412] px-6 py-16 text-center text-[#ababa8]">
                <p className="text-lg">No fixtures generated yet.</p>
                <Link
                  href="/"
                  className="mt-6 inline-block rounded-xl bg-[#6bff8f] px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-[#005f28]"
                >
                  Go to Generate Fixtures
                </Link>
              </div>
            ) : (
              <div className="grid gap-8 lg:grid-cols-2">
                {groupsWithFixtures.map((group) => (
                  <article
                    key={group.name}
                    className="animate-in rounded-[2.5rem] border border-[#474846]/20 bg-[#1e201d] duration-300"
                  >
                    <div className="flex items-center justify-between border-b border-[#474846]/20 bg-linear-to-r from-[#6bff8f]/8 to-transparent p-8">
                      <h4 className="text-2xl font-black uppercase tracking-tight">{group.name}</h4>
                    </div>

                    <div className="space-y-6 p-8">
                      {group.fixtures.length === 0 ? (
                        <p className="text-sm text-[#ababa8]">Not enough teams in this group.</p>
                      ) : (
                        group.fixtures.map((match: Match) => (
                          <div
                            key={`${match.home}-${match.away}`}
                            className="glass-panel flex items-center justify-between gap-4 rounded-2xl p-4 transition hover:border-[#6bff8f]/40 md:p-6"
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                              <span className="font-semibold">{match.home}</span>
                            </div>

                            <div className="flex items-center gap-2 px-2 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  inputMode="numeric"
                                  value={fixtureData?.matchScores[getMatchKey(group.name, match)]?.homeGoals ?? ""}
                                  onChange={(event) =>
                                    handleGoalChange(group.name, match, "homeGoals", event.target.value)
                                  }
                                  className="h-9 w-14 rounded-md border border-[#474846] bg-black px-2 text-center text-sm font-bold text-[#faf9f5] outline-none focus:border-[#6bff8f]/40"
                                  aria-label={`${match.home} goals`}
                                />
                                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#ababa8]">:</span>
                                <input
                                  type="number"
                                  min={0}
                                  inputMode="numeric"
                                  value={fixtureData?.matchScores[getMatchKey(group.name, match)]?.awayGoals ?? ""}
                                  onChange={(event) =>
                                    handleGoalChange(group.name, match, "awayGoals", event.target.value)
                                  }
                                  className="h-9 w-14 rounded-md border border-[#474846] bg-black px-2 text-center text-sm font-bold text-[#faf9f5] outline-none focus:border-[#6bff8f]/40"
                                  aria-label={`${match.away} goals`}
                                />
                            </div>

                            <div className="flex min-w-0 flex-1 items-center justify-end gap-3 text-right">
                              <span className="font-semibold">{match.away}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="mx-auto max-w-7xl px-6 pb-10">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <h3 className="text-3xl font-black uppercase tracking-tight text-white">Knockout Stage</h3>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-[#6bff8f]">
                  Quarter Final, Semi Final, Final
                </p>
              </div>

            </div>

            {!groupStageComplete ? (
              <div className="rounded-[2rem] border border-dashed border-[#474846] bg-[#121412] px-6 py-10 text-sm text-[#ababa8]">
                Enter all group-stage goals to declare quarter-final teams.
              </div>
            ) : knockoutStage.qualified.length < 2 ? (
              <div className="rounded-[2rem] border border-dashed border-[#474846] bg-[#121412] px-6 py-10 text-sm text-[#ababa8]">
                Need at least 2 teams to create a knockout final.
              </div>
            ) : (
              <div className="space-y-8">
                <div className="grid gap-4 md:grid-cols-2">
                  {knockoutStage.quarterfinals.map(renderKnockoutMatch)}
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  {knockoutStage.semifinals.map(renderKnockoutMatch)}
                </div>

                {knockoutStage.final ? <div className="grid gap-4 lg:grid-cols-1">{renderKnockoutMatch(knockoutStage.final)}</div> : null}
              </div>
            )}
          </section>
        </main>

        {isTableOpen && hasResult ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
            <div className="relative max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-[2rem] border border-[#474846]/30 bg-[#1e201d] shadow-[0_0_60px_rgba(0,0,0,0.55)]">
              <div className="flex items-center justify-between border-b border-[#474846]/20 px-6 py-5 md:px-8">
                <div>
                  <h4 className="text-2xl font-black uppercase tracking-tight text-white">Table</h4>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-[#6bff8f]">
                    Automatic standings from goals
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsTableOpen(false)}
                  className="flex size-10 items-center justify-center rounded-full border border-[#474846] bg-[#242623] text-[#faf9f5] transition hover:bg-[#6bff8f]/20"
                  aria-label="Close table"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="px-6 py-6 md:px-8 md:py-8">
                <div className="overflow-x-auto rounded-2xl border border-[#474846]/30">
                  <table className="w-full min-w-190 text-left text-xs">
                    <thead className="bg-[#242623] text-[#ababa8]">
                      <tr>
                        <th className="px-3 py-2 font-bold uppercase tracking-wider">No</th>
                        <th className="px-3 py-2 font-bold uppercase tracking-wider">Team</th>
                        <th className="px-2 py-2 font-bold uppercase tracking-wider">P</th>
                        <th className="px-2 py-2 font-bold uppercase tracking-wider">W</th>
                        <th className="px-2 py-2 font-bold uppercase tracking-wider">D</th>
                        <th className="px-2 py-2 font-bold uppercase tracking-wider">L</th>
                        <th className="px-2 py-2 font-bold uppercase tracking-wider">GD</th>
                        <th className="px-3 py-2 font-bold uppercase tracking-wider">PTS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overallStandings.map((row, index) => (
                        <tr key={row.team} className="border-t border-[#474846]/20">
                          <td className="px-3 py-2 font-semibold text-[#ababa8]">{index + 1}</td>
                          <td className="px-3 py-2 font-semibold">{row.team}</td>
                          <td className="px-2 py-2">{row.played}</td>
                          <td className="px-2 py-2">{row.won}</td>
                          <td className="px-2 py-2">{row.draw}</td>
                          <td className="px-2 py-2">{row.lost}</td>
                          <td className="px-2 py-2">{row.goalDifference}</td>
                          <td className="px-3 py-2 font-black text-[#6bff8f]">{row.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <style jsx global>{`
        .pitch-texture {
          background-image: radial-gradient(circle at 2px 2px, rgba(107, 255, 143, 0.05) 1px, transparent 0);
          background-size: 32px 32px;
        }

        .glass-panel {
          background: rgba(30, 32, 29, 0.4);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(71, 72, 70, 0.3);
        }
      `}</style>
    </>
  )
}
