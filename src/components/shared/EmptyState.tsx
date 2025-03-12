import React from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { LucideIcon } from 'lucide-react-native';
import { commonStyles } from '../../theme/commonStyles';
import { appColors } from '../../theme';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, subtitle }) => (
  <View style={commonStyles.emptyState}>
    <View style={commonStyles.emptyStateIcon}>
      <Icon color={appColors.primary} size={32} />
    </View>
    <Text style={commonStyles.emptyStateText}>{title}</Text>
    <Text style={commonStyles.emptyStateSubtext}>{subtitle}</Text>
  </View>
);

export default EmptyState; 