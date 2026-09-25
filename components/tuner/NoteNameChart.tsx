import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import {
  NOTE_NAME_CHART_TITLE,
  NOTE_NAME_CHART_SECTIONS,
  NOTE_NAME_CHART_LEGEND,
  type NoteNameChartRow,
} from '@/lib/noteNameChartData';
import { styles } from '@/lib/tabs/tuner/styles';

type ThemeColors = {
  text: string;
  textSecondary: string;
  surface: string;
  secondary: string;
};

type NoteNameChartProps = {
  theme: ThemeColors;
};

function ChartRow({
  row,
  textColor,
  textSecondary,
  borderColor,
  isLast,
}: {
  row: NoteNameChartRow;
  textColor: string;
  textSecondary: string;
  borderColor: string;
  isLast: boolean;
}) {
  const hasSub = Boolean(row.sub);

  return (
    <View
      style={[
        styles.noteNameChartRow,
        { borderBottomColor: borderColor },
        isLast && styles.noteNameChartRowLast,
      ]}
    >
      <View style={[styles.noteNameChartLabelCell, { borderRightColor: borderColor }]}>
        <Text style={[styles.noteNameChartLabelText, { color: textColor }]} numberOfLines={2}>
          {row.label}
        </Text>
      </View>
      {row.values.map((value, index) => (
        <View
          key={`${row.label}-${index}`}
          style={[
            styles.noteNameChartDataCell,
            { borderRightColor: borderColor },
            index === row.values.length - 1 && styles.noteNameChartDataCellLast,
          ]}
        >
          <Text
            style={[
              styles.noteNameChartValueText,
              { color: textColor },
              hasSub && styles.noteNameChartValueTextCompact,
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {value}
          </Text>
          {hasSub && row.sub?.[index] ? (
            <Text style={[styles.noteNameChartSubText, { color: textSecondary }]} numberOfLines={1}>
              {row.sub[index]}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function NoteNameChart({ theme }: NoteNameChartProps) {
  const borderColor = theme.secondary;

  return (
    <View
      style={[
        styles.noteNameChartPanel,
        { backgroundColor: theme.surface, borderColor: theme.secondary },
      ]}
    >
      <Text style={[styles.noteNameChartTitle, { color: theme.text }]}>{NOTE_NAME_CHART_TITLE}</Text>

      {NOTE_NAME_CHART_SECTIONS.map((section, sectionIndex) => (
        <View
          key={section.title}
          style={[
            styles.noteNameChartSection,
            sectionIndex > 0 && styles.noteNameChartSectionSpaced,
          ]}
        >
          <Text style={[styles.noteNameChartSectionTitle, { color: theme.text }]}>
            {section.title}
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.noteNameChartScrollContent}
          >
            <View style={[styles.noteNameChartTable, { borderColor }]}>
              {section.rows.map((row, rowIndex) => (
                <ChartRow
                  key={row.label}
                  row={row}
                  textColor={theme.text}
                  textSecondary={theme.textSecondary}
                  borderColor={borderColor}
                  isLast={rowIndex === section.rows.length - 1}
                />
              ))}
            </View>
          </ScrollView>
        </View>
      ))}

      <Text style={[styles.noteNameChartLegend, { color: theme.textSecondary }]}>
        {NOTE_NAME_CHART_LEGEND}
      </Text>
    </View>
  );
}

export default React.memo(NoteNameChart);
