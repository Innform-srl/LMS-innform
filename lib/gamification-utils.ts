// Pure utility functions for gamification calculations
// These can be safely used in client components

// Calculate level from points
export function calculateLevel(points: number): number {
    // Level formula: Level N requires 100 * N^2 points
    // Solve for N: N = sqrt(points / 100)
    return Math.floor(Math.sqrt(points / 100)) + 1
}

// Calculate points needed for next level
export function pointsForNextLevel(currentLevel: number): number {
    return 100 * (currentLevel ** 2)
}
