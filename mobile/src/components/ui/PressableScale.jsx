import React, { useRef } from 'react';
import { Animated, Pressable, Platform } from 'react-native';

// Touchable that gently shrinks on press for a tactile, premium feel.
export default function PressableScale({
  children,
  style,
  containerStyle,
  onPress,
  disabled,
  scaleTo = 0.96,
  ...rest
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (toValue) => {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: Platform.OS !== 'web',
      speed: 40,
      bounciness: toValue === 1 ? 8 : 0,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => animateTo(scaleTo)}
      onPressOut={() => animateTo(1)}
      style={containerStyle}
      {...rest}
    >
      <Animated.View style={[style, { transform: [{ scale }] }, disabled && { opacity: 0.55 }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
