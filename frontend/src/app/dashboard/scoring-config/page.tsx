'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { scoringConfigApi } from '@/lib/api';

// Category palette — kept in sync with the grade badges on the KPI and
// Achievements pages so a rating looks identical everywhere in the app.
const CATEGORY_HSL: Record<string, string> = {
  Excellent: '142, 76%, 46%',
  'Very Good': '160, 84%, 39%',
  Good: '190, 80%, 42%',
  Poor: '38, 92%, 50%',
  Bad: '0, 72%, 55%',
};

const catHsl = (grade: string) => CATEGORY_HSL[grade] ?? '215, 20%, 55%';

// Soft tinted surface (bg + text + border) that reads correctly in both themes
// because it layers translucent brand colour over the themed card.
const catTint = (grade: string) => {
  const c = catHsl(grade);
  return {
    background: `hsla(${c}, 0.12)`,
    color: `hsl(${c})`,
    border: `1px solid hsla(${c}, 0.3)`,
  };
};

export default function ScoringConfigPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sampleScore, setSampleScore] = useState('');

  const [config, setConfig] = useState({
    capMultiplier: 1.2,
    excellentThreshold: 130,
    veryGoodThreshold: 110,
    goodThreshold: 90,
    poorThreshold: 70,
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchConfig();
    }
  }, [user?.role]);

  const fetchConfig = async () => {
    try {
      const { data } = await scoringConfigApi.getConfig();
      setConfig({
        capMultiplier: Number(data.capMultiplier),
        excellentThreshold: Number(data.excellentThreshold),
        veryGoodThreshold: Number(data.veryGoodThreshold),
        goodThreshold: Number(data.goodThreshold),
        poorThreshold: Number(data.poorThreshold),
      });
    } catch (error) {
      setErrors(['Failed to load scoring configuration']);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const validateConfig = (): boolean => {
    const newErrors: string[] = [];

    // Validate cap multiplier
    if (config.capMultiplier < 1 || config.capMultiplier > 2) {
      newErrors.push('Cap multiplier must be between 1.0 and 2.0');
    }

    // Validate thresholds are in descending order
    if (config.excellentThreshold <= config.veryGoodThreshold) {
      newErrors.push('Excellent threshold must be greater than Very Good threshold');
    }
    if (config.veryGoodThreshold <= config.goodThreshold) {
      newErrors.push('Very Good threshold must be greater than Good threshold');
    }
    if (config.goodThreshold <= config.poorThreshold) {
      newErrors.push('Good threshold must be greater than Poor threshold');
    }
    if (config.poorThreshold <= 0) {
      newErrors.push('Poor threshold must be greater than 0');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSave = async () => {
    if (!validateConfig()) {
      return;
    }

    setSaving(true);
    setSuccessMessage('');
    try {
      await scoringConfigApi.updateConfig(config);
      setSuccessMessage('Scoring configuration updated successfully');
      fetchConfig(); // Refresh config
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      const apiMessage = (error as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      setErrors([apiMessage || 'Failed to update configuration']);
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const getGradeForScore = (score: number): string => {
    if (score > config.excellentThreshold) return 'Excellent';
    if (score > config.veryGoodThreshold) return 'Very Good';
    if (score > config.goodThreshold) return 'Good';
    if (score > config.poorThreshold) return 'Poor';
    return 'Bad';
  };

  // Check if user is admin
  if (user?.role !== 'ADMIN') {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div
          className="glass-card px-4 py-3"
          style={catTint('Bad')}
        >
          <strong>Access denied:</strong> This page is only available to administrators.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <p style={{ color: 'hsl(var(--muted-foreground))' }}>Loading configuration…</p>
      </div>
    );
  }

  const thresholdFields = [
    {
      key: 'excellentThreshold' as const,
      grade: 'Excellent',
      label: 'Excellent threshold',
      fallback: 130,
    },
    {
      key: 'veryGoodThreshold' as const,
      grade: 'Very Good',
      label: 'Very Good threshold',
      fallback: 110,
    },
    {
      key: 'goodThreshold' as const,
      grade: 'Good',
      label: 'Good threshold',
      fallback: 90,
    },
    {
      key: 'poorThreshold' as const,
      grade: 'Poor',
      label: 'Poor threshold',
      fallback: 70,
    },
  ];

  const previewRows = [
    { grade: 'Excellent', range: `> ${config.excellentThreshold}%` },
    { grade: 'Very Good', range: `${config.veryGoodThreshold}% – ${config.excellentThreshold}%` },
    { grade: 'Good', range: `${config.goodThreshold}% – ${config.veryGoodThreshold}%` },
    { grade: 'Poor', range: `${config.poorThreshold}% – ${config.goodThreshold}%` },
    { grade: 'Bad', range: `≤ ${config.poorThreshold}%` },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
        Scoring Configuration
      </h1>
      <p className="mb-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
        Set how KPI scores are capped and how total scores map to category ratings.
        Changes apply to all future score calculations.
      </p>

      <div className="glass-card p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'hsl(var(--foreground))' }}>
          Score calculation settings
        </h2>

        {/* Cap Multiplier */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2" style={{ color: 'hsl(var(--foreground))' }}>
            Cap multiplier
            <span className="font-normal ml-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
              (Maximum score as % of weight)
            </span>
          </label>
          <input
            type="number"
            step="0.1"
            min="1"
            max="2"
            value={config.capMultiplier}
            onChange={(e) =>
              setConfig({ ...config, capMultiplier: parseFloat(e.target.value) || 1.2 })
            }
            className="w-full"
          />
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Current: {(config.capMultiplier * 100).toFixed(0)}% of weight. Default is 1.2 (120%).
          </p>
        </div>

        {/* Grade Thresholds */}
        <div className="mb-4">
          <h3 className="text-base font-medium mb-1" style={{ color: 'hsl(var(--foreground))' }}>
            Category thresholds (%)
          </h3>
          <p className="text-sm mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
            A total score above each threshold earns the matching category rating.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {thresholdFields.map((f) => (
              <div key={f.key}>
                <label className="flex items-center text-sm font-medium mb-2" style={{ color: 'hsl(var(--foreground))' }}>
                  <span
                    className="inline-block w-3 h-3 rounded mr-2"
                    style={{ background: `hsl(${catHsl(f.grade)})` }}
                  ></span>
                  {f.label}
                </label>
                <input
                  type="number"
                  step="1"
                  value={config[f.key]}
                  onChange={(e) =>
                    setConfig({ ...config, [f.key]: parseFloat(e.target.value) || f.fallback })
                  }
                  className="w-full"
                />
                <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  Score &gt; {config[f.key]}% = {f.grade}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="px-4 py-3 rounded-lg mb-4" style={catTint('Excellent')}>
            <strong>Success:</strong> {successMessage}
          </div>
        )}

        {/* Validation Errors */}
        {errors.length > 0 && (
          <div className="px-4 py-3 rounded-lg mb-4" style={catTint('Bad')}>
            <strong>Please fix the following:</strong>
            <ul className="list-disc list-inside mt-2">
              {errors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving} className="btn btn-primary px-6">
            {saving ? 'Saving…' : 'Save configuration'}
          </button>
        </div>
      </div>

      {/* Grade Preview Table */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'hsl(var(--foreground))' }}>
          Category preview
        </h2>
        <p className="text-sm mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
          How total scores are categorized with the current thresholds.
        </p>

        <div className="overflow-hidden rounded-lg" style={{ border: '1px solid hsl(var(--border))' }}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th
                  className="px-4 py-2 text-left font-semibold"
                  style={{ background: 'hsla(217.2, 32.6%, 30%, 0.2)', color: 'hsl(var(--foreground))', borderBottom: '1px solid hsl(var(--border))' }}
                >
                  Score range (%)
                </th>
                <th
                  className="px-4 py-2 text-left font-semibold"
                  style={{ background: 'hsla(217.2, 32.6%, 30%, 0.2)', color: 'hsl(var(--foreground))', borderBottom: '1px solid hsl(var(--border))' }}
                >
                  Category
                </th>
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, idx) => (
                <tr key={row.grade} style={{ background: `hsla(${catHsl(row.grade)}, 0.08)` }}>
                  <td
                    className="px-4 py-2 font-medium"
                    style={{ color: 'hsl(var(--foreground))', borderTop: idx ? '1px solid hsl(var(--border))' : 'none' }}
                  >
                    {row.range}
                  </td>
                  <td
                    className="px-4 py-2 font-semibold"
                    style={{ color: `hsl(${catHsl(row.grade)})`, borderTop: idx ? '1px solid hsl(var(--border))' : 'none' }}
                  >
                    {row.grade}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Interactive Score Preview */}
        <div className="mt-6">
          <h3 className="text-base font-medium mb-2" style={{ color: 'hsl(var(--foreground))' }}>
            Try a score
          </h3>
          <p className="text-sm mb-3" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Enter a score percentage to preview its category.
          </p>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <input
              type="number"
              step="1"
              value={sampleScore}
              onChange={(e) => setSampleScore(e.target.value)}
              placeholder="e.g. 115"
              className="w-48"
            />
            {sampleScore !== '' && !isNaN(parseFloat(sampleScore)) && (
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-lg"
                style={catTint(getGradeForScore(parseFloat(sampleScore)))}
              >
                <span className="text-sm font-medium">Category:</span>
                <span className="text-xl font-bold">
                  {getGradeForScore(parseFloat(sampleScore))}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Example Calculations */}
        <div className="mt-6">
          <h3 className="text-base font-medium mb-2" style={{ color: 'hsl(var(--foreground))' }}>
            Example scores
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {[140, 120, 100, 80, 60].map((score) => {
              const grade = getGradeForScore(score);
              return (
                <div
                  key={score}
                  className="rounded-lg p-3 text-center"
                  style={catTint(grade)}
                >
                  <div className="text-2xl font-bold">{score}%</div>
                  <div className="text-sm font-semibold mt-1">{grade}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
