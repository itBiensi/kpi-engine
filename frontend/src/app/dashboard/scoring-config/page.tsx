'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { scoringConfigApi } from '@/lib/api';

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
    } catch (error: any) {
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
    } catch (error: any) {
      setErrors([error.response?.data?.message || 'Failed to update configuration']);
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

  const getGradeColor = (grade: string): string => {
    switch (grade) {
      case 'Excellent':
        return 'text-blue-700 dark:text-blue-200 bg-blue-100 dark:bg-blue-900';
      case 'Very Good':
        return 'text-cyan-700 dark:text-cyan-200 bg-cyan-100 dark:bg-cyan-800';
      case 'Good':
        return 'text-green-700 dark:text-green-200 bg-green-100 dark:bg-green-800';
      case 'Poor':
        return 'text-amber-700 dark:text-amber-200 bg-amber-100 dark:bg-amber-800';
      case 'Bad':
        return 'text-red-700 dark:text-red-200 bg-red-100 dark:bg-red-800';
      default:
        return 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800';
    }
  };

  // Check if user is admin
  if (user?.role !== 'ADMIN') {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <strong>Access Denied:</strong> This page is only accessible to administrators.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <p>Loading configuration...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Scoring Configuration</h1>
      <p className="text-gray-600 mb-6">
        Configure dynamic scoring rules for KPI calculations. Changes apply to all future score calculations.
      </p>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 dark:text-white">Score Calculation Settings</h2>

        {/* Cap Multiplier */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Cap Multiplier
            <span className="text-gray-500 dark:text-gray-400 font-normal ml-2">
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
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Current: {(config.capMultiplier * 100).toFixed(0)}% of weight. Default is 1.2 (120%).
          </p>
        </div>

        {/* Grade Thresholds */}
        <div className="mb-4">
          <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">Category Thresholds (%)</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Total scores above these percentage thresholds will receive the corresponding category rating.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Excellent */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <span className="inline-block w-3 h-3 bg-blue-500 dark:bg-blue-400 rounded mr-2"></span>
                Excellent Threshold
              </label>
              <input
                type="number"
                step="1"
                value={config.excellentThreshold}
                onChange={(e) =>
                  setConfig({ ...config, excellentThreshold: parseFloat(e.target.value) || 130 })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Score &gt; {config.excellentThreshold}% = Excellent
              </p>
            </div>

            {/* Very Good */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <span className="inline-block w-3 h-3 bg-cyan-500 dark:bg-cyan-400 rounded mr-2"></span>
                Very Good Threshold
              </label>
              <input
                type="number"
                step="1"
                value={config.veryGoodThreshold}
                onChange={(e) =>
                  setConfig({ ...config, veryGoodThreshold: parseFloat(e.target.value) || 110 })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Score &gt; {config.veryGoodThreshold}% = Very Good
              </p>
            </div>

            {/* Good */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <span className="inline-block w-3 h-3 bg-green-500 dark:bg-green-400 rounded mr-2"></span>
                Good Threshold
              </label>
              <input
                type="number"
                step="1"
                value={config.goodThreshold}
                onChange={(e) =>
                  setConfig({ ...config, goodThreshold: parseFloat(e.target.value) || 90 })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Score &gt; {config.goodThreshold}% = Good
              </p>
            </div>

            {/* Poor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <span className="inline-block w-3 h-3 bg-amber-500 dark:bg-amber-400 rounded mr-2"></span>
                Poor Threshold
              </label>
              <input
                type="number"
                step="1"
                value={config.poorThreshold}
                onChange={(e) =>
                  setConfig({ ...config, poorThreshold: parseFloat(e.target.value) || 70 })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Score &gt; {config.poorThreshold}% = Poor
              </p>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-400 px-4 py-3 rounded mb-4">
            <strong>Success:</strong> {successMessage}
          </div>
        )}

        {/* Validation Errors */}
        {errors.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-4">
            <strong>Validation Errors:</strong>
            <ul className="list-disc list-inside mt-2">
              {errors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      {/* Grade Preview Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4 dark:text-white">Category Preview</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Preview of how total scores will be categorized with current thresholds:
        </p>

        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-700">
              <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left dark:text-white">Score Range (%)</th>
              <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left dark:text-white">Category</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-blue-50 dark:bg-blue-900">
              <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 font-semibold dark:text-gray-300">
                &gt; {config.excellentThreshold}%
              </td>
              <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 font-semibold text-blue-600 dark:text-blue-300">
                Excellent
              </td>
            </tr>
            <tr className="bg-cyan-50 dark:bg-cyan-800">
              <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 dark:text-gray-300">
                {config.veryGoodThreshold}% - {config.excellentThreshold}%
              </td>
              <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 font-semibold text-cyan-600 dark:text-cyan-300">
                Very Good
              </td>
            </tr>
            <tr className="bg-green-50 dark:bg-green-800">
              <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 dark:text-gray-300">
                {config.goodThreshold}% - {config.veryGoodThreshold}%
              </td>
              <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 font-semibold text-green-600 dark:text-green-300">
                Good
              </td>
            </tr>
            <tr className="bg-amber-50 dark:bg-amber-800">
              <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 dark:text-gray-300">
                {config.poorThreshold}% - {config.goodThreshold}%
              </td>
              <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 font-semibold text-amber-600 dark:text-amber-300">
                Poor
              </td>
            </tr>
            <tr className="bg-red-50 dark:bg-red-800">
              <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 dark:text-gray-300">
                &le; {config.poorThreshold}%
              </td>
              <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 font-semibold text-red-600 dark:text-red-300">
                Bad
              </td>
            </tr>
          </tbody>
        </table>

        {/* Interactive Score Preview */}
        <div className="mt-6">
          <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Try a Score</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Enter any score percentage to preview the category assignment:
          </p>
          <div className="flex items-center gap-4 mb-4">
            <input
              type="number"
              step="1"
              value={sampleScore}
              onChange={(e) => setSampleScore(e.target.value)}
              placeholder="Enter score % (e.g., 115)"
              className="w-48 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {sampleScore !== '' && !isNaN(parseFloat(sampleScore)) && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 ${getGradeColor(getGradeForScore(parseFloat(sampleScore)))}`}>
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
          <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Example Scores:</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {[140, 120, 100, 80, 60].map((score) => {
              const grade = getGradeForScore(score);
              return (
                <div
                  key={score}
                  className={`border border-gray-300 dark:border-gray-600 rounded p-3 text-center ${getGradeColor(grade)}`}
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
