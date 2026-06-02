export const playerBlocks = {
  1: { prediction: "S", points: "T", index: "U" },
  2: { prediction: "V", points: "W", index: "X" },
  3: { prediction: "Y", points: "Z", index: "AA" },
  4: { prediction: "AB", points: "AC", index: "AD" },
  5: { prediction: "AE", points: "AF", index: "AG" },
  6: { prediction: "AH", points: "AI", index: "AJ" },
  7: { prediction: "AK", points: "AL", index: "AM" }
} as const;

export function excelPredictionValue(homeGoals: number | null, awayGoals: number | null) {
  if (homeGoals === null || awayGoals === null) {
    return "-";
  }

  const sign = homeGoals > awayGoals ? "1" : homeGoals < awayGoals ? "2" : "X";
  return `${sign}|${homeGoals}-${awayGoals}`;
}
