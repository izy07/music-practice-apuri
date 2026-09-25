import React from 'react';
import { View, Text, StyleSheet, type TextStyle, type ViewStyle } from 'react-native';
import type { LegalSection } from '@/lib/legal/types';
import { LEGAL_LAST_UPDATED } from '@/lib/legal/types';

type ThemeColors = {
  text: string;
  textSecondary: string;
  surface: string;
  primary: string;
};

type Props = {
  documentTitle: string;
  documentSubtitle?: string;
  sections: LegalSection[];
  variant?: 'plain' | 'themed';
  theme?: ThemeColors;
  importantNotice?: string;
  showFooter?: boolean;
};

const plainColors: ThemeColors = {
  text: '#212121',
  textSecondary: '#757575',
  surface: '#FFFFFF',
  primary: '#2E7D32',
};

export default function LegalDocumentBody({
  documentTitle,
  documentSubtitle,
  sections,
  variant = 'plain',
  theme,
  importantNotice,
  showFooter = true,
}: Props) {
  const colors = theme ?? plainColors;
  const isThemed = variant === 'themed';

  return (
    <>
      <View style={isThemed ? [styles.titleSection, { backgroundColor: colors.surface }] : styles.section}>
        <Text style={[isThemed ? styles.themedTitle : styles.title, { color: colors.text }]}>
          {documentTitle}
        </Text>
        {documentSubtitle ? (
          <Text style={[isThemed ? styles.subtitle : styles.text, { color: colors.textSecondary }]}>
            {documentSubtitle}
          </Text>
        ) : null}
        <Text style={[isThemed ? styles.lastUpdated : styles.effectiveDate, { color: colors.textSecondary }]}>
          最終更新日: {LEGAL_LAST_UPDATED}
        </Text>
        {importantNotice ? (
          <Text
            style={[
              styles.text,
              {
                color: isThemed ? colors.text : colors.primary,
                fontWeight: '600',
                marginTop: isThemed ? 0 : 8,
              },
            ]}
          >
            {importantNotice}
          </Text>
        ) : null}
      </View>

      {sections.map((section, index) => (
        <View
          key={`${section.title ?? 'section'}-${index}`}
          style={isThemed ? [styles.themedSection, { backgroundColor: colors.surface }] : styles.section}
        >
          {section.title ? (
            <Text style={[isThemed ? styles.themedSectionTitle : styles.sectionTitle, { color: colors.text }]}>
              {section.title}
            </Text>
          ) : null}
          {section.paragraphs.map((paragraph, paragraphIndex) => (
            <Text
              key={`${index}-${paragraphIndex}`}
              style={[isThemed ? styles.themedSectionText : styles.text, { color: isThemed ? colors.textSecondary : colors.text }]}
            >
              {paragraph}
            </Text>
          ))}
        </View>
      ))}

      {showFooter ? (
        <View style={isThemed ? [styles.themedSection, { backgroundColor: colors.surface }] : styles.section}>
          <Text style={[isThemed ? styles.themedSectionText : styles.text, { color: isThemed ? colors.textSecondary : colors.text }]}>
            以上
          </Text>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    marginVertical: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  effectiveDate: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  titleSection: {
    padding: 24,
    borderRadius: 16,
    marginTop: 20,
    marginBottom: 20,
    alignItems: 'center',
    elevation: 2,
  },
  themedTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  lastUpdated: {
    fontSize: 14,
    textAlign: 'center',
  },
  themedSection: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 2,
  },
  themedSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  themedSectionText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
});
