import { ScoringEngine } from './scoring.engine';

describe('ScoringEngine', () => {
    describe('MAXIMIZE polarity', () => {
        it('should calculate score correctly when actual < target', () => {
            const result = ScoringEngine.calculate({
                polarity: 'MAX',
                weight: 30,
                targetValue: 100,
                actualValue: 80,
            });
            expect(result.achievementPct).toBe(80);
            expect(result.finalScore).toBe(24); // (80/100) * 30 = 24
        });

        it('should calculate score when actual > target', () => {
            const result = ScoringEngine.calculate({
                polarity: 'MAX',
                weight: 30,
                targetValue: 100,
                actualValue: 130,
            });
            expect(result.achievementPct).toBe(130);
            // Raw = 39, but cap = 30 * 1.2 = 36
            expect(result.finalScore).toBe(36);
        });

        it('should apply cap rule at 120% of weight', () => {
            const result = ScoringEngine.calculate({
                polarity: 'MAX',
                weight: 20,
                targetValue: 50,
                actualValue: 200,
            });
            // Raw = (200/50) * 20 = 80, cap = 20 * 1.2 = 24
            expect(result.finalScore).toBe(24);
        });

        it('should throw error for target = 0', () => {
            expect(() =>
                ScoringEngine.calculate({
                    polarity: 'MAX',
                    weight: 30,
                    targetValue: 0,
                    actualValue: 50,
                }),
            ).toThrow('MAXIMIZE polarity cannot have target value of 0');
        });

        it('should return 0 when actual = 0', () => {
            const result = ScoringEngine.calculate({
                polarity: 'MAX',
                weight: 25,
                targetValue: 100,
                actualValue: 0,
            });
            expect(result.finalScore).toBe(0);
        });
    });

    describe('MINIMIZE polarity', () => {
        it('should calculate score correctly when actual < target (good)', () => {
            const result = ScoringEngine.calculate({
                polarity: 'MIN',
                weight: 20,
                targetValue: 10,
                actualValue: 5,
            });
            // Score = ((2*10 - 5) / 10) * 20 = (15/10) * 20 = 30, cap = 24
            expect(result.finalScore).toBe(24);
        });

        it('should decrease score when actual > target', () => {
            const result = ScoringEngine.calculate({
                polarity: 'MIN',
                weight: 20,
                targetValue: 10,
                actualValue: 15,
            });
            // Score = ((2*10 - 15) / 10) * 20 = (5/10) * 20 = 10
            expect(result.finalScore).toBe(10);
        });

        it('should apply floor rule when actual far exceeds target', () => {
            const result = ScoringEngine.calculate({
                polarity: 'MIN',
                weight: 20,
                targetValue: 10,
                actualValue: 25,
            });
            // Score = ((20 - 25) / 10) * 20 = (-5/10) * 20 = -10 → floor = 0
            expect(result.finalScore).toBe(0);
        });
    });

    describe('BINARY polarity', () => {
        it('should return full weight when actual equals target', () => {
            const result = ScoringEngine.calculate({
                polarity: 'BINARY',
                weight: 15,
                targetValue: 1,
                actualValue: 1,
            });
            expect(result.finalScore).toBe(15);
            expect(result.achievementPct).toBe(100);
        });

        it('should return 0 when actual does not equal target', () => {
            const result = ScoringEngine.calculate({
                polarity: 'BINARY',
                weight: 15,
                targetValue: 1,
                actualValue: 0,
            });
            expect(result.finalScore).toBe(0);
            expect(result.achievementPct).toBe(0);
        });
    });

    describe('calculateTotal', () => {
        it('should calculate total score and grade correctly', () => {
            const result = ScoringEngine.calculateTotal([
                { polarity: 'MAX', weight: 40, targetValue: 100, actualValue: 90 },
                { polarity: 'MIN', weight: 30, targetValue: 10, actualValue: 8 },
                { polarity: 'BINARY', weight: 30, targetValue: 1, actualValue: 1 },
            ]);

            // MAX: (90/100)*40 = 36
            // MIN: ((20-8)/10)*30 = 36, capped at 30*1.2 = 36
            // BINARY: 30
            expect(result.totalScore).toBe(102);
            expect(result.finalGrade).toBe('A');
        });
    });

    describe('Grade determination', () => {
        it('should return A for score > 90', () => {
            expect(ScoringEngine.determineGrade(95)).toBe('A');
        });
        it('should return B for score > 75', () => {
            expect(ScoringEngine.determineGrade(80)).toBe('B');
        });
        it('should return C for score > 60', () => {
            expect(ScoringEngine.determineGrade(65)).toBe('C');
        });
        it('should return D for score > 50', () => {
            expect(ScoringEngine.determineGrade(55)).toBe('D');
        });
        it('should return E for score <= 50', () => {
            expect(ScoringEngine.determineGrade(40)).toBe('E');
        });
    });
});
