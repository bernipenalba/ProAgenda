import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

const TIME_SLOTS: string[] = [];
for (let h = 8; h <= 21; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
  if (h < 21) TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}

interface Props {
  value: string;
  onChange: (time: string) => void;
  c: typeof Colors['light'];
  bookedTimes?: string[];
}

export function TimePicker({ value, onChange, c, bookedTimes = [] }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={tp.scroll}
      contentContainerStyle={tp.content}>
      {TIME_SLOTS.map(slot => {
        const isSelected = slot === value;
        const isBooked = bookedTimes.includes(slot);

        if (isBooked) {
          return (
            <View
              key={slot}
              style={[tp.chip, { backgroundColor: c.mutedLight, borderColor: c.border, opacity: 0.45 }]}>
              <Text style={[tp.chipText, { color: c.muted, textDecorationLine: 'line-through' }]}>
                {slot}
              </Text>
            </View>
          );
        }

        return (
          <TouchableOpacity
            key={slot}
            style={[
              tp.chip,
              {
                backgroundColor: isSelected ? c.accent : c.mutedLight,
                borderColor: isSelected ? c.accent : c.border,
              },
            ]}
            onPress={() => onChange(slot)}
            activeOpacity={0.75}>
            <Text style={[tp.chipText, { color: isSelected ? '#fff' : c.muted }]}>
              {slot}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const tp = StyleSheet.create({
  scroll: { marginHorizontal: -2 },
  content: { gap: 7, paddingHorizontal: 2, paddingVertical: 2, flexDirection: 'row' },
  chip: {
    paddingHorizontal: 11, paddingVertical: 9,
    borderRadius: 10, borderWidth: 1.5,
  },
  chipText: { fontSize: 13, fontWeight: '700' },
});
