"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import type { Group, Team } from "@/lib/fixtures"
import { createGroups } from "@/lib/group"
import { shuffleArray } from "@/lib/shuffle"

const STORAGE_KEY = "fixture-generator-data"

type FixturePayload = {
  teams: Team[]
  groupSize: number
  groups: Group[]
  generatedAt: string
}

function parseTeams(text: string): Team[] {
  return text
    .split(/[\n,]+/)
    .map((team) => team.trim())
    .filter(Boolean)
}

export default function Home() {
  const router = useRouter()
  const [teamsText, setTeamsText] = useState("")
  const [groupSize, setGroupSize] = useState(3)
  const [error, setError] = useState("")

  const handleGenerate = () => {
    const teams = parseTeams(teamsText)

    if (teams.length === 0) {
      setError("Please enter at least two team names.")
      return
    }

    if (teams.length < 2) {
      setError("At least two teams are required to generate fixtures.")
      return
    }

    const safeGroupSize = Number.isFinite(groupSize)
      ? Math.max(2, Math.floor(groupSize))
      : 3

    const shuffledTeams = shuffleArray(teams)
    const groups = createGroups(shuffledTeams, safeGroupSize)

    const payload: FixturePayload = {
      teams,
      groupSize: safeGroupSize,
      groups,
      generatedAt: new Date().toISOString(),
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    setError("")
    router.push("/fixtures")
  }

  return (
    <main className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden bg-[#0d0f0d] px-6 text-[#faf9f5]">
      <div className="pointer-events-none absolute left-1/2 top-0 h-100 w-200 -translate-x-1/2 rounded-full bg-[#6bff8f]/10 blur-[120px]" />

      <section className="relative mx-auto w-full max-w-3xl rounded-[2rem] border border-[#474846]/20 bg-[#1e201d] p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] md:p-12">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-black uppercase tracking-tight text-[#6bff8f] md:text-5xl">
            Generate Fixtures
          </h1>
        </div>

        <div className="space-y-8">
          <div>
            <label className="mb-3 block text-sm font-bold uppercase tracking-wider text-[#ababa8]">
              Enter Team Names (comma or new line)
            </label>
            <textarea
              value={teamsText}
              onChange={(event) => setTeamsText(event.target.value)}
              className="h-52 w-full rounded-xl border border-transparent bg-black p-4 text-lg text-[#faf9f5] outline-none transition focus:border-[#6bff8f]/40 focus:ring-2 focus:ring-[#6bff8f]/30"
              placeholder="FC Barcelona&#10;Real Madrid&#10;Manchester City"
            />
          </div>

          <div className="grid items-end gap-6 md:grid-cols-[1fr_auto]">
            <div>
              <label className="mb-3 block text-sm font-bold uppercase tracking-wider text-[#ababa8]">
                Group Size
              </label>
              <select
                value={groupSize}
                onChange={(event) => setGroupSize(Number(event.target.value))}
                className="w-full rounded-xl border border-transparent bg-black p-4 text-[#faf9f5] outline-none transition focus:border-[#6bff8f]/40 focus:ring-2 focus:ring-[#6bff8f]/30"
              >
                <option value={3}>3 Teams per Group</option>
              </select>
            </div>

            <button
              onClick={handleGenerate}
              className="h-14 rounded-xl bg-[#6bff8f] px-8 text-sm font-black uppercase tracking-[0.2em] text-[#005f28] shadow-[0_0_30px_rgba(107,255,143,0.3)] transition hover:shadow-[0_0_45px_rgba(107,255,143,0.5)] active:scale-[0.98]"
            >
              Generate Fixtures
            </button>
          </div>

          {error ? (
            <p className="rounded-xl border border-[#ff7351]/40 bg-[#b92902]/20 px-4 py-3 text-sm font-semibold text-[#ffd2c8]">
              {error}
            </p>
          ) : null}
        </div>
      </section>
    </main>
  )
}
