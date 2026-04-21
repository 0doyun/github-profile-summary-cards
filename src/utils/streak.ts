import {ProfileContribution} from '../github-api/profile-details';

export interface StreakStats {
    currentStreak: number;
    currentStreakStart: Date | null;
    currentStreakEnd: Date | null;
    longestStreak: number;
    longestStreakStart: Date | null;
    longestStreakEnd: Date | null;
    totalContributions: number;
    firstContribution: Date | null;
}

export function calcStreak(contributions: ProfileContribution[]): StreakStats {
    const sorted = [...contributions].sort((a, b) => a.date.getTime() - b.date.getTime());

    let longest = 0;
    let longestStart: Date | null = null;
    let longestEnd: Date | null = null;
    let run = 0;
    let runStart: Date | null = null;
    let total = 0;
    let firstContribution: Date | null = null;

    for (const day of sorted) {
        total += day.contributionCount;
        if (firstContribution === null && day.contributionCount > 0) {
            firstContribution = day.date;
        }
        if (day.contributionCount > 0) {
            if (run === 0) runStart = day.date;
            run += 1;
            if (run > longest) {
                longest = run;
                longestStart = runStart;
                longestEnd = day.date;
            }
        } else {
            run = 0;
            runStart = null;
        }
    }

    let current = 0;
    let currentStart: Date | null = null;
    let currentEnd: Date | null = null;
    let allowedSkip = true;
    for (let i = sorted.length - 1; i >= 0; i--) {
        const day = sorted[i];
        if (day.contributionCount > 0) {
            if (currentEnd === null) currentEnd = day.date;
            current += 1;
            currentStart = day.date;
            allowedSkip = false;
        } else {
            if (allowedSkip && i === sorted.length - 1) {
                allowedSkip = false;
                continue;
            }
            break;
        }
    }

    return {
        currentStreak: current,
        currentStreakStart: currentStart,
        currentStreakEnd: currentEnd,
        longestStreak: longest,
        longestStreakStart: longestStart,
        longestStreakEnd: longestEnd,
        totalContributions: total,
        firstContribution: firstContribution
    };
}
