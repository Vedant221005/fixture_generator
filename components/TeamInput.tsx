"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type TeamInputProps = {
  teamsText: string
  groupSize: number
  hasResult: boolean
  onTeamsTextChange: (value: string) => void
  onGroupSizeChange: (value: number) => void
  onGenerate: () => void
  onRegenerate: () => void
}

export function TeamInput({
  teamsText,
  groupSize,
  hasResult,
  onTeamsTextChange,
  onGroupSizeChange,
  onGenerate,
  onRegenerate,
}: TeamInputProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Football Fixture Generator</CardTitle>
        <CardDescription>
          Enter team names separated by commas or new lines.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="teams-input">
            Teams
          </label>
          <Textarea
            id="teams-input"
            value={teamsText}
            onChange={(event) => onTeamsTextChange(event.target.value)}
            placeholder="Arsenal, Barcelona, Chelsea&#10;Liverpool&#10;Real Madrid"
            className="min-h-36"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-[160px_1fr] sm:items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="group-size">
              Group Size
            </label>
            <Input
              id="group-size"
              type="number"
              min={2}
              value={groupSize}
              onChange={(event) => onGroupSizeChange(Number(event.target.value))}
            />
          </div>

          <div className="flex flex-wrap gap-2 sm:justify-end">
            {hasResult ? (
              <Button variant="outline" onClick={onRegenerate}>
                Regenerate
              </Button>
            ) : null}
            <Button onClick={onGenerate}>Generate Fixtures</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}