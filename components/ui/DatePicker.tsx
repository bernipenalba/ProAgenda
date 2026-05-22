import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const YEARS = [2025, 2026, 2027];

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

function parseDateParts(dateStr: string): { day: number; month: number; year: number } {
  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return { day: d, month: m, year: y };
  }
  const now = new Date();
  return { day: now.getDate(), month: now.getMonth() + 1, year: now.getFullYear() };
}

function buildDate(day: number, month: number, year: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

type Panel = 'day' | 'month' | 'year' | null;

interface Props {
  value: string;
  onChange: (date: string) => void;
  c: typeof Colors['light'];
}

export function DatePicker({ value, onChange, c }: Props) {
  const { day, month, year } = parseDateParts(value);
  const [open, setOpen] = useState<Panel>(null);

  const maxDay = daysInMonth(month, year);
  const days = Array.from({ length: maxDay }, (_, i) => i + 1);

  function toggle(panel: Panel) {
    setOpen(prev => (prev === panel ? null : panel));
  }

  function pickDay(d: number) {
    onChange(buildDate(d, month, year));
    setOpen(null);
  }

  function pickMonth(m: number) {
    onChange(buildDate(Math.min(day, daysInMonth(m, year)), m, year));
    setOpen(null);
  }

  function pickYear(y: number) {
    onChange(buildDate(Math.min(day, daysInMonth(month, y)), month, y));
    setOpen(null);
  }

  return (
    <View>
      <View style={[dp.row, { borderColor: c.border, backgroundColor: c.background }]}>
        <TouchableOpacity
          style={[dp.col, open === 'day' && { backgroundColor: c.accentLight }]}
          onPress={() => toggle('day')}
          activeOpacity={0.75}>
          <Text style={[dp.colLabel, { color: c.muted }]}>Día</Text>
          <Text style={[dp.colValue, { color: open === 'day' ? c.accent : c.text }]}>
            {String(day).padStart(2, '0')}
          </Text>
        </TouchableOpacity>

        <View style={[dp.sep, { backgroundColor: c.border }]} />

        <TouchableOpacity
          style={[dp.col, { flex: 1.6 }, open === 'month' && { backgroundColor: c.accentLight }]}
          onPress={() => toggle('month')}
          activeOpacity={0.75}>
          <Text style={[dp.colLabel, { color: c.muted }]}>Mes</Text>
          <Text style={[dp.colValue, { color: open === 'month' ? c.accent : c.text }]}>
            {MONTHS_ES[month - 1]}
          </Text>
        </TouchableOpacity>

        <View style={[dp.sep, { backgroundColor: c.border }]} />

        <TouchableOpacity
          style={[dp.col, { flex: 1.3 }, open === 'year' && { backgroundColor: c.accentLight }]}
          onPress={() => toggle('year')}
          activeOpacity={0.75}>
          <Text style={[dp.colLabel, { color: c.muted }]}>Año</Text>
          <Text style={[dp.colValue, { color: open === 'year' ? c.accent : c.text }]}>
            {year}
          </Text>
        </TouchableOpacity>
      </View>

      {open === 'day' && (
        <View style={[dp.panel, { backgroundColor: c.card, borderColor: c.border }]}>
          <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
            {days.map(d => (
              <TouchableOpacity
                key={d}
                style={[dp.option, d === day && { backgroundColor: c.accentLight }]}
                onPress={() => pickDay(d)}>
                <Text style={[dp.optionText, { color: d === day ? c.accent : c.text }]}>
                  {String(d).padStart(2, '0')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {open === 'month' && (
        <View style={[dp.panel, { backgroundColor: c.card, borderColor: c.border }]}>
          <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
            {MONTHS_ES.map((name, idx) => {
              const m = idx + 1;
              return (
                <TouchableOpacity
                  key={m}
                  style={[dp.option, m === month && { backgroundColor: c.accentLight }]}
                  onPress={() => pickMonth(m)}>
                  <Text style={[dp.optionText, { color: m === month ? c.accent : c.text }]}>
                    {name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {open === 'year' && (
        <View style={[dp.panel, { backgroundColor: c.card, borderColor: c.border }]}>
          {YEARS.map(y => (
            <TouchableOpacity
              key={y}
              style={[dp.option, y === year && { backgroundColor: c.accentLight }]}
              onPress={() => pickYear(y)}>
              <Text style={[dp.optionText, { color: y === year ? c.accent : c.text }]}>
                {y}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const dp = StyleSheet.create({
  row: {
    flexDirection: 'row', borderWidth: 1.5, borderRadius: 13, overflow: 'hidden',
  },
  col: { flex: 1, paddingVertical: 12, alignItems: 'center', gap: 3 },
  sep: { width: 1 },
  colLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  colValue: { fontSize: 16, fontWeight: '800' },
  panel: {
    borderWidth: 1, borderRadius: 12, marginTop: 4, overflow: 'hidden',
  },
  option: { paddingHorizontal: 16, paddingVertical: 11 },
  optionText: { fontSize: 14, fontWeight: '600' },
});
