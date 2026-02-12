/**
 * KPI Scoring Engine
 *
 * Implements the three polarity-based calculation methods:
 * - MAXIMIZE: Higher is better (Sales, Uptime)
 * - MINIMIZE: Lower is better (Bugs, Complaints)
 * - BINARY: All-or-nothing (Certificate, Audit Pass)
 *
 * Business Rules:
 * 1. Floor Rule: Score cannot go below 0
 * 2. Cap Rule: Score capped at 120% of weight
 * 3. Zero Target: MAXIMIZE with target=0 is rejected (must use BINARY)
 */

export type PolarityType = 'MAX' | 'MIN' | 'BINARY';

export interface ScoreInput {
    polarity: PolarityType;
    weight: number;
    targetValue: number;
    actualValue: number;
}

export interface ScoreResult {
    achievementPct: number;
    rawScore: number;
    finalScore: number;
}

export interface ScoringConfigValues {
    capMultiplier?: number;
    gradeAThreshold?: number;
    gradeBThreshold?: number;
    gradeCThreshold?: number;
    gradeDThreshold?: number;
}

export class ScoringEngine {
    private static readonly DEFAULT_CAP_MULTIPLIER = 1.2; // 120% cap

    /**
     * Calculate score for a single KPI item
     */
    static calculate(input: ScoreInput, config?: ScoringConfigValues): ScoreResult {
        const capMultiplier = config?.capMultiplier || ScoringEngine.DEFAULT_CAP_MULTIPLIER;
        const { polarity, weight, targetValue, actualValue } = input;

        // Zero Target Handling for MAXIMIZE
        if (polarity === 'MAX' && targetValue === 0) {
            throw new Error(
                'MAXIMIZE polarity cannot have target value of 0. Use BINARY instead.',
            );
        }

        let achievementPct: number;
        let rawScore: number;

        switch (polarity) {
            case 'MAX':
                // Higher is better: Score = (Actual / Target) * Weight
                achievementPct = (actualValue / targetValue) * 100;
                rawScore = (actualValue / targetValue) * weight;
                break;

            case 'MIN':
                // Lower is better: Score = ((2 * Target - Actual) / Target) * Weight
                if (targetValue === 0) {
                    achievementPct = actualValue === 0 ? 100 : 0;
                    rawScore = actualValue === 0 ? weight : 0;
                } else {
                    achievementPct =
                        ((2 * targetValue - actualValue) / targetValue) * 100;
                    rawScore =
                        ((2 * targetValue - actualValue) / targetValue) * weight;
                }
                break;

            case 'BINARY':
                // All or nothing: Score = (Actual === Target) ? Weight : 0
                achievementPct = actualValue === targetValue ? 100 : 0;
                rawScore = actualValue === targetValue ? weight : 0;
                break;

            default:
                throw new Error(`Unknown polarity: ${polarity}`);
        }

        // Floor Rule: minimum 0
        const floored = Math.max(0, rawScore);

        // Cap Rule: maximum (capMultiplier * 100)% of weight
        const capped = Math.min(floored, weight * capMultiplier);

        // Round to 2 decimal places
        const finalScore = Math.round(capped * 100) / 100;
        achievementPct = Math.round(achievementPct * 100) / 100;

        return {
            achievementPct,
            rawScore: Math.round(rawScore * 100) / 100,
            finalScore,
        };
    }

    /**
     * Calculate total score for all KPI items and determine grade
     */
    static calculateTotal(items: ScoreInput[], config?: ScoringConfigValues): {
        totalScore: number;
        finalGrade: string;
        details: ScoreResult[];
    } {
        const details = items.map((item) => ScoringEngine.calculate(item, config));
        const totalScore =
            Math.round(details.reduce((sum, d) => sum + d.finalScore, 0) * 100) /
            100;
        const finalGrade = ScoringEngine.determineGrade(totalScore, config);

        return { totalScore, finalGrade, details };
    }

    /**
     * Determine letter grade based on total score
     * Uses configurable thresholds or defaults: A: > 90, B: > 75, C: > 60, D: > 50, E: <= 50
     */
    static determineGrade(totalScore: number, config?: ScoringConfigValues): string {
        const gradeA = config?.gradeAThreshold || 90;
        const gradeB = config?.gradeBThreshold || 75;
        const gradeC = config?.gradeCThreshold || 60;
        const gradeD = config?.gradeDThreshold || 50;

        if (totalScore > gradeA) return 'A';
        if (totalScore > gradeB) return 'B';
        if (totalScore > gradeC) return 'C';
        if (totalScore > gradeD) return 'D';
        return 'E';
    }
}
