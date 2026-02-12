'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { scoringConfigApi } from '@/lib/api';

export default function ScoringConfigPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [config, setConfig] = useState({
    capMultiplier: 1.2,
    gradeAThreshold: 90,
    gradeBThreshold: 75,
    gradeCThreshold: 60,
    gradeDThreshold: 50,
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
        gradeAThreshold: Number(data.gradeAThreshold),
        gradeBThreshold: Number(data.gradeBThreshold),
        gradeCThreshold: Number(data.gradeCThreshold),
        gradeDThreshold: Number(data.gradeDThreshold),
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
    if (config.gradeAThreshold <= config.gradeBThreshold) {
      newErrors.push('Grade A threshold must be greater than Grade B threshold');
    }
    if (config.gradeBThreshold <= config.gradeCThreshold) {
      newErrors.push('Grade B threshold must be greater than Grade C threshold');
    }
    if (config.gradeCThreshold <= config.gradeDThreshold) {
      newErrors.push('Grade C threshold must be greater than Grade D threshold');
    }
    if (config.gradeDThreshold <= 0) {
      newErrors.push('Grade D threshold must be greater than 0');
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
    if (score > config.gradeAThreshold) return 'A';
    if (score > config.gradeBThreshold) return 'B';
    if (score > config.gradeCThreshold) return 'C';
    if (score > config.gradeDThreshold) return 'D';
    return 'E';
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

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Score Calculation Settings</h2>

        {/* Cap Multiplier */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cap Multiplier
            <span className="text-gray-500 font-normal ml-2">
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-sm text-gray-500 mt-1">
            Current: {(config.capMultiplier * 100).toFixed(0)}% of weight. Default is 1.2 (120%).
          </p>
        </div>

        {/* Grade Thresholds */}
        <div className="mb-4">
          <h3 className="text-md font-medium text-gray-700 mb-3">Grade Thresholds</h3>
          <p className="text-sm text-gray-500 mb-4">
            Total scores above these thresholds will receive the corresponding letter grade.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Grade A */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grade A Threshold
              </label>
              <input
                type="number"
                step="0.1"
                value={config.gradeAThreshold}
                onChange={(e) =>
                  setConfig({ ...config, gradeAThreshold: parseFloat(e.target.value) || 90 })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-500 mt-1">
                Score &gt; {config.gradeAThreshold} = Grade A
              </p>
            </div>

            {/* Grade B */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grade B Threshold
              </label>
              <input
                type="number"
                step="0.1"
                value={config.gradeBThreshold}
                onChange={(e) =>
                  setConfig({ ...config, gradeBThreshold: parseFloat(e.target.value) || 75 })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-500 mt-1">
                Score &gt; {config.gradeBThreshold} = Grade B
              </p>
            </div>

            {/* Grade C */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grade C Threshold
              </label>
              <input
                type="number"
                step="0.1"
                value={config.gradeCThreshold}
                onChange={(e) =>
                  setConfig({ ...config, gradeCThreshold: parseFloat(e.target.value) || 60 })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-500 mt-1">
                Score &gt; {config.gradeCThreshold} = Grade C
              </p>
            </div>

            {/* Grade D */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grade D Threshold
              </label>
              <input
                type="number"
                step="0.1"
                value={config.gradeDThreshold}
                onChange={(e) =>
                  setConfig({ ...config, gradeDThreshold: parseFloat(e.target.value) || 50 })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-500 mt-1">
                Score &gt; {config.gradeDThreshold} = Grade D
              </p>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
            <strong>Success:</strong> {successMessage}
          </div>
        )}

        {/* Validation Errors */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
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
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Grade Preview</h2>
        <p className="text-sm text-gray-600 mb-4">
          Preview of how total scores will be graded with current thresholds:
        </p>

        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2 text-left">Score Range</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Grade</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 px-4 py-2">
                &gt; {config.gradeAThreshold}
              </td>
              <td className="border border-gray-300 px-4 py-2 font-semibold text-green-600">
                A (Excellent)
              </td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-4 py-2">
                {config.gradeBThreshold + 0.01} - {config.gradeAThreshold}
              </td>
              <td className="border border-gray-300 px-4 py-2 font-semibold text-blue-600">
                B (Good)
              </td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-4 py-2">
                {config.gradeCThreshold + 0.01} - {config.gradeBThreshold}
              </td>
              <td className="border border-gray-300 px-4 py-2 font-semibold text-yellow-600">
                C (Satisfactory)
              </td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-4 py-2">
                {config.gradeDThreshold + 0.01} - {config.gradeCThreshold}
              </td>
              <td className="border border-gray-300 px-4 py-2 font-semibold text-orange-600">
                D (Needs Improvement)
              </td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-4 py-2">
                ≤ {config.gradeDThreshold}
              </td>
              <td className="border border-gray-300 px-4 py-2 font-semibold text-red-600">
                E (Unsatisfactory)
              </td>
            </tr>
          </tbody>
        </table>

        {/* Example Calculations */}
        <div className="mt-6">
          <h3 className="text-md font-medium text-gray-700 mb-2">Example Scores:</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {[100, 85, 70, 55, 40].map((score) => (
              <div
                key={score}
                className="border border-gray-300 rounded p-3 text-center"
              >
                <div className="text-2xl font-bold">{score}</div>
                <div className="text-sm text-gray-600">
                  Grade: <span className="font-semibold">{getGradeForScore(score)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
