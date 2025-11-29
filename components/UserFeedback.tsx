import React, { memo, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { createShadowStyle } from '@/lib/shadowStyles';

interface UserFeedbackProps {
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  visible: boolean;
  onClose: () => void;
  action?: {
    label: string;
    onPress: () => void;
  };
  autoHide?: boolean;
  duration?: number;
}

const UserFeedback = memo(function UserFeedback({
  type,
  title,
  message,
  visible,
  onClose,
  action,
  autoHide = false,
  duration = 3000
}: UserFeedbackProps) {
  const colors = useThemeColors();
  
  React.useEffect(() => {
    if (visible && autoHide) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [visible, autoHide, duration, onClose]);
  
  const icon = useMemo(() => {
    switch (type) {
      case 'success':
        return <CheckCircle size={24} color="#10B981" />;
      case 'error':
        return <AlertCircle size={24} color="#EF4444" />;
      case 'info':
        return <Info size={24} color={colors.primary} />;
    }
  }, [type, colors.primary]);
  
  const backgroundColor = useMemo(() => {
    switch (type) {
      case 'success':
        return '#F0FDF4';
      case 'error':
        return '#FEF2F2';
      case 'info':
        return colors.surface;
    }
  }, [type, colors.surface]);
  
  const borderColor = useMemo(() => {
    switch (type) {
      case 'success':
        return '#BBF7D0';
      case 'error':
        return '#FECACA';
      case 'info':
        return colors.secondary;
    }
  }, [type, colors.secondary]);
  
  const handleActionPress = useCallback(() => {
    action?.onPress();
  }, [action]);
  
  if (!visible) return null;
  
  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor,
        borderColor
      }
    ]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          {icon}
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
        </View>
        <TouchableOpacity
          style={[styles.closeButton, { backgroundColor: colors.secondary }]}
          onPress={onClose}
        >
          <X size={16} color={colors.text} />
        </TouchableOpacity>
      </View>
      
      {action && (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={handleActionPress}
          >
            <Text style={styles.actionButtonText}>{action.label}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

export default UserFeedback;

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 8,
    ...createShadowStyle({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    }),
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  closeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  actionContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
