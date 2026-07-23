import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../styles/globalStyles';

type GradientHeaderProps = {
  title?: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  children?: React.ReactNode;
  style?: any;
  colors?: string[];
  titleContainerStyle?: any;
};

export default function GradientHeader({ title, leftAction, rightAction, children, style, colors, titleContainerStyle }: GradientHeaderProps) {
  return (
    <LinearGradient
      colors={colors || ['#FFF4EB', '#F3E2D1', '#E3C5A7']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.headerContainer, style]}
    >
      <View style={styles.leftActionWrapper}>{leftAction}</View>
      <View style={[styles.titleContainer, titleContainerStyle]}>
        {children ? children : <Text style={styles.titleText}>{title}</Text>}
      </View>
      <View style={styles.rightActionWrapper}>{rightAction}</View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    minHeight: 60,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginTop: Platform.OS === 'android' ? 20 : 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(184,115,51,0.18)',
    shadowColor: COLORS.secondary,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 12,
    elevation: 3,
  },
  leftActionWrapper: {
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  rightActionWrapper: {
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 0,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.secondary,
  },
});
