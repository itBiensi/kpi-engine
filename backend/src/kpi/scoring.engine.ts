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
    excellentThreshold?: number;
    veryGoodThreshold?: number;
    goodThreshold?: number;
    poorThreshold?: number;
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
     * Determine category grade based on total score (as percentage)
     * Uses configurable thresholds or defaults:
     * Excellent: > 130%, Very Good: 110-130%, Good: 90-110%, Poor: 70-90%, Bad: <= 70%
     */
    static determineGrade(totalScore: number, config?: ScoringConfigValues): string {
        const excellent = config?.excellentThreshold || 130;
        const veryGood = config?.veryGoodThreshold || 110;
        const good = config?.goodThreshold || 90;
        const poor = config?.poorThreshold || 70;

        if (totalScore > excellent) return 'Excellent';
        if (totalScore > veryGood) return 'Very Good';
        if (totalScore > good) return 'Good';
        if (totalScore > poor) return 'Poor';
        return 'Bad';
    }
}
