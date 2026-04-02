"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Copy, RefreshCw, Trophy } from "lucide-react"

import { generateFixtures, type Group, type Match, type Team } from "@/lib/fixtures"
import { createGroups } from "@/lib/group"
import { shuffleArray } from "@/lib/shuffle"

const STORAGE_KEY = "fixture-generator-data"

type FixturePayload = {
  teams: Team[]
  groupSize: number
  groups: Group[]
  generatedAt: string
}

function buildShareText(groups: Group[]): string {
  return groups
    .map((group) => {
      const lines: string[] = [group.name, "Teams:"]
      group.teams.forEach((team) => lines.push(`- ${team}`))

      const matches: string[] = []
      for (let homeIndex = 0; homeIndex < group.teams.length; homeIndex += 1) {
        for (let awayIndex = homeIndex + 1; awayIndex < group.teams.length; awayIndex += 1) {
          matches.push(`${group.teams[homeIndex]} vs ${group.teams[awayIndex]}`)
        }
      }

      lines.push("Fixtures:")
      if (matches.length === 0) {
        lines.push("- Not enough teams")
      } else {
        matches.forEach((match) => lines.push(`- ${match}`))
      }

      return lines.join("\n")
    })
    .join("\n\n")
}

function getTeamCode(team: string): string {
  const words = team
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (words.length === 1) {
    return words[0].slice(0, 3).toUpperCase()
  }

  return words
    .slice(0, 3)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
}

export default function FixturesPage() {
  const [fixtureData, setFixtureData] = useState<FixturePayload | null>(() => {
    if (typeof window === "undefined") {
      return null
    }

    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }

    try {
      const parsed = JSON.parse(raw) as FixturePayload
      const teams = Array.isArray(parsed.teams) ? parsed.teams : []
      const groups = Array.isArray(parsed.groups) ? parsed.groups : []
      const groupSize = typeof parsed.groupSize === "number" ? parsed.groupSize : 3
      const generatedAt = typeof parsed.generatedAt === "string" ? parsed.generatedAt : new Date().toISOString()

      return {
        teams,
        groups,
        groupSize,
        generatedAt,
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
  })
  const [copied, setCopied] = useState(false)

  const hasResult = Boolean(fixtureData && fixtureData.groups.length > 0)

  const groupsWithFixtures = useMemo(() => {
    return (fixtureData?.groups ?? []).map((group) => ({
      ...group,
      fixtures: generateFixtures(group.teams),
    }))
  }, [fixtureData])

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
    })
  }, [fixtureData])

  const handleRegenerate = () => {
    if (!fixtureData || fixtureData.teams.length < 2) {
      return
    }

    const shuffledTeams = shuffleArray(fixtureData.teams)
    const nextGroups = createGroups(shuffledTeams, fixtureData.groupSize)
    const nextGeneratedAt = new Date().toISOString()

    const payload: FixturePayload = {
      teams: fixtureData.teams,
      groupSize: fixtureData.groupSize,
      groups: nextGroups,
      generatedAt: nextGeneratedAt,
    }

    setFixtureData(payload)
    setCopied(false)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }

  const handleCopy = async () => {
    if (!hasResult) {
      return
    }

    const text = buildShareText(fixtureData?.groups ?? [])
    await navigator.clipboard.writeText(text)
    setCopied(true)
  }

  return (
    <>
      <div className="min-h-screen bg-[#0d0f0d] text-[#faf9f5] selection:bg-[#6bff8f] selection:text-[#005f28]">
        <header className="sticky top-0 z-30 border-b border-[#1e201d] bg-[#0d0f0d]/95 shadow-[0_0_40px_rgba(107,255,143,0.08)] backdrop-blur">
          <div className="mx-auto flex w-full max-w-screen-2xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-[#6bff8f] text-[#005f28]">
                <Trophy className="size-5" />
              </div>
              <p className="text-2xl font-black uppercase tracking-tight text-[#6bff8f]">
                Fixture Generator
              </p>
            </div>
            <nav className="hidden items-center gap-8 text-sm font-bold uppercase tracking-wide md:flex">
              <span className="border-b-2 border-[#6bff8f] pb-1 text-[#6bff8f]">Fixtures</span>
            </nav>
          </div>
        </header>

        <main>
          <section className="relative overflow-hidden px-6 pb-10 pt-16">
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
                  onClick={handleRegenerate}
                  disabled={!hasResult}
                  className="flex items-center gap-2 rounded-full border border-[#474846] bg-[#242623] px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#faf9f5] transition hover:bg-[#6bff8f]/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <RefreshCw className="size-4" />
                  Regenerate
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

                    <div className="space-y-4 p-8">
                      {group.fixtures.length === 0 ? (
                        <p className="text-sm text-[#ababa8]">Not enough teams in this group.</p>
                      ) : (
                        group.fixtures.map((match: Match) => (
                          <div
                            key={`${match.home}-${match.away}`}
                            className="glass-panel flex items-center justify-between rounded-2xl p-4 transition hover:border-[#6bff8f]/40 md:p-6"
                          >
                            <div className="flex flex-1 items-center gap-3">
                              <div className="flex size-10 items-center justify-center rounded-full border border-[#474846] bg-black text-xs font-black uppercase md:size-12 md:text-sm">
                                {getTeamCode(match.home)}
                              </div>
                              <span className="font-semibold">{match.home}</span>
                            </div>

                            <div className="px-2 text-center">
                              <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#6bff8f]">
                                VS
                              </span>
                              <RefreshCw className="mx-auto mt-1 size-4 text-[#ababa8]" />
                            </div>

                            <div className="flex flex-1 items-center justify-end gap-3 text-right">
                              <span className="font-semibold">{match.away}</span>
                              <div className="flex size-10 items-center justify-center rounded-full border border-[#474846] bg-black text-xs font-black uppercase md:size-12 md:text-sm">
                                {getTeamCode(match.away)}
                              </div>
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
        </main>
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
