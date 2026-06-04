import { useState, useEffect } from 'react';
import { StyleSheet, View, Animated as RNAnimated } from 'react-native';

const DURATION = 800;

export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true);
  const [opacity] = useState(new RNAnimated.Value(1));

  useEffect(() => {
    RNAnimated.timing(opacity, {
      toValue: 0,
      duration: DURATION,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
    });
  }, []);

  if (!visible) return null;

  return (
    <RNAnimated.View
      style={[
        styles.backgroundSolidColor,
        { opacity },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  backgroundSolidColor: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0f172a',
    zIndex: 1000,
  },
});
