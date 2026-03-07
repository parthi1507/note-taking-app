import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

export default function SkeletonCard() {
  const pulse = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.9, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.card, { opacity: pulse }]}>
      <View style={styles.accentLine} />
      <View style={styles.body}>
        <View style={styles.titleBar} />
        <View style={[styles.line, { width: '88%' }]} />
        <View style={[styles.line, { width: '70%' }]} />
        <View style={[styles.line, { width: '50%' }]} />
        <View style={styles.footer}>
          <View style={styles.tag} />
          <View style={styles.dateBar} />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(108,71,255,0.15)',
    backgroundColor: 'rgba(18,18,30,0.9)',
    overflow: 'hidden',
  },
  accentLine: {
    height: 2,
    backgroundColor: 'rgba(108,71,255,0.4)',
  },
  body: {
    padding: 16,
    gap: 10,
  },
  titleBar: {
    height: 14,
    width: '55%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 6,
  },
  line: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  tag: {
    height: 18,
    width: 56,
    backgroundColor: 'rgba(108,71,255,0.12)',
    borderRadius: 6,
  },
  dateBar: {
    height: 10,
    width: 36,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 5,
  },
});
