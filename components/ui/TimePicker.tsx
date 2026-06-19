import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

const HOURS = ['08','09','10','11','12','13','14','15','16','17','18','19','20','21'];
const MINUTES = ['00','15','30','45'];

function parseTime(val: string): { hour: string; minute: string } {
  if (val && /^\d{2}:\d{2}$/.test(val)) {
    const [h, m] = val.split(':');
    return { hour: h, minute: m };
  }
  return { hour: '', minute: '' };
}

interface Props {
  value: string;
  onChange: (time: string) => void;
  c: typeof Colors['light'];
  bookedTimes?: string[];
}

type Panel = 'hour' | 'minute' | null;

export function TimePicker({ value, onChange, c, bookedTimes = [] }: Props) {
  const [pickedHour, setPickedHour] = useState('');
  const [pickedMinute, setPickedMinute] = useState('');
  const [open, setOpen] = useState<Panel>(null);

  // Sync internal state when value changes externally:
  // - modal opens with an existing appointment (edit/reschedule)
  // - modal resets for a new appointment (value → '')
  useEffect(() => {
    const { hour, minute } = parseTime(value);
    setPickedHour(hour);
    setPickedMinute(minute);
  }, [value]);

  function toggle(panel: Panel) {
    setOpen(prev => (prev === panel ? null : panel));
  }

  function pickHour(h: string) {
    if (pickedMinute) {
      const candidate = `${h}:${pickedMinute}`;
      if (!bookedTimes.includes(candidate)) {
        // Minute already chosen and not conflicting → emit full time, close
        setPickedHour(h);
        onChange(candidate);
        setOpen(null);
      } else {
        // New hour conflicts with current minute → clear minute, advance to minute panel
        setPickedHour(h);
        setPickedMinute('');
        setOpen('minute');
      }
    } else {
      // No minute chosen yet → store hour, advance to minute panel
      setPickedHour(h);
      setOpen('minute');
    }
  }

  function pickMinute(m: string) {
    if (!pickedHour || bookedTimes.includes(`${pickedHour}:${m}`)) return;
    setPickedMinute(m);
    onChange(`${pickedHour}:${m}`);
    setOpen(null);
  }

  function isMinuteBooked(m: string): boolean {
    if (!pickedHour) return false;
    return bookedTimes.includes(`${pickedHour}:${m}`);
  }

  // Dot indicator: at least one minute slot at this hour is taken
  function hourHasBookedSlot(h: string): boolean {
    return MINUTES.some(m => bookedTimes.includes(`${h}:${m}`));
  }

  return (
    <View>
      {/* ── display row (mirrors DatePicker layout) ── */}
      <View style={[tp.row, { borderColor: c.border, backgroundColor: c.background }]}>
        <TouchableOpacity
          style={[tp.col, open === 'hour' && { backgroundColor: c.accentLight }]}
          onPress={() => toggle('hour')}
          activeOpacity={0.75}>
          <Text style={[tp.colLabel, { color: c.muted }]}>HORA</Text>
          <Text style={[
            tp.colValue,
            { color: open === 'hour' ? c.accent : pickedHour ? c.text : c.muted },
          ]}>
            {pickedHour || '--'}
          </Text>
        </TouchableOpacity>

        <View style={[tp.sep, { backgroundColor: c.border }]} />

        <TouchableOpacity
          style={[tp.col, open === 'minute' && { backgroundColor: c.accentLight }]}
          onPress={() => toggle('minute')}
          activeOpacity={0.75}>
          <Text style={[tp.colLabel, { color: c.muted }]}>MIN</Text>
          <Text style={[
            tp.colValue,
            { color: open === 'minute' ? c.accent : pickedMinute ? c.text : c.muted },
          ]}>
            {pickedMinute || '--'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── hour panel ── */}
      {open === 'hour' && (
        <View style={[tp.panel, { backgroundColor: c.card, borderColor: c.border }]}>
          <ScrollView
            style={{ maxHeight: 210 }}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled>
            {HOURS.map(h => {
              const isSelected = h === pickedHour;
              const hasBooked = hourHasBookedSlot(h);
              return (
                <TouchableOpacity
                  key={h}
                  style={[tp.option, isSelected && { backgroundColor: c.accentLight }]}
                  onPress={() => pickHour(h)}
                  activeOpacity={0.7}>
                  <Text style={[tp.optionText, { color: isSelected ? c.accent : c.text }]}>
                    {h}:00
                  </Text>
                  {hasBooked && (
                    <View style={[tp.bookedDot, { backgroundColor: c.warning }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── minute panel ── */}
      {open === 'minute' && (
        <View style={[tp.panel, { backgroundColor: c.card, borderColor: c.border }]}>
          {!pickedHour ? (
            <Text style={[tp.hint, { color: c.muted }]}>Primero seleccioná la hora</Text>
          ) : (
            <View style={tp.minuteRow}>
              {MINUTES.map(m => {
                const isSelected = m === pickedMinute;
                const isBooked = isMinuteBooked(m);
                return (
                  <TouchableOpacity
                    key={m}
                    style={[
                      tp.minuteChip,
                      {
                        backgroundColor: isBooked
                          ? c.mutedLight
                          : isSelected
                          ? c.accent
                          : c.background,
                        borderColor: isSelected ? c.accent : c.border,
                        opacity: isBooked ? 0.4 : 1,
                      },
                    ]}
                    onPress={() => pickMinute(m)}
                    disabled={isBooked}
                    activeOpacity={isBooked ? 1 : 0.75}>
                    <Text style={[
                      tp.minuteText,
                      {
                        color: isBooked ? c.muted : isSelected ? '#fff' : c.text,
                        textDecorationLine: isBooked ? 'line-through' : 'none',
                      },
                    ]}>
                      :{m}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const tp = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderRadius: 13,
    overflow: 'hidden',
  },
  col: { flex: 1, paddingVertical: 12, alignItems: 'center', gap: 3 },
  sep: { width: 1 },
  colLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  colValue: { fontSize: 22, fontWeight: '800' },
  panel: {
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 4,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  optionText: { fontSize: 15, fontWeight: '700' },
  bookedDot: { width: 7, height: 7, borderRadius: 4 },
  minuteRow: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  minuteChip: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 11,
    borderWidth: 1.5,
  },
  minuteText: { fontSize: 17, fontWeight: '800' },
  hint: { fontSize: 13, padding: 14, textAlign: 'center' },
});
