import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { Image as ImageIcon } from 'lucide-react-native';
import { appColors } from '../theme';

interface ItemCardProps {
    title: string;
    subtitle?: string;
    subtitleStyle?: any;
    imageUri?: string;
    onPress: () => void;
    onLongPress?: () => void;
    rightElement?: React.ReactNode;
    footer?: React.ReactNode;
    style?: ViewStyle;
    placeholderIcon?: React.ReactNode;
    coverOverlay?: React.ReactNode;
    layout?: 'list' | 'grid';
    badge?: React.ReactNode;
}

export const ItemCard = React.memo<ItemCardProps>(({
    title,
    subtitle,
    subtitleStyle,
    imageUri,
    onPress,
    onLongPress,
    rightElement,
    footer,
    style,
    placeholderIcon,
    coverOverlay,
    layout = 'list',
    badge,
}) => {
    const theme = useTheme();

    if (layout === 'grid') {
        return (
            <TouchableOpacity
                onPress={onPress}
                onLongPress={onLongPress}
                delayLongPress={500}
                activeOpacity={0.7}
                style={[styles.gridContainer, style]}
            >
                <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                    <View style={styles.gridContent}>
                        <View style={styles.gridImageContainer}>
                            {imageUri ? (
                                <Card.Cover source={{ uri: imageUri }} style={styles.gridCover} />
                            ) : (
                                <View style={[styles.placeholder, { backgroundColor: theme.colors.surfaceVariant }]}>
                                    {placeholderIcon || <ImageIcon size={40} color={appColors.primary} />}
                                </View>
                            )}
                            {coverOverlay}
                            {badge && (
                                <View style={styles.badgeOverlay}>
                                    {badge}
                                </View>
                            )}
                        </View>

                        <View style={styles.gridInfoContainer}>
                            <View style={styles.headerRow}>
                                <View style={styles.textContainer}>
                                    <Text style={[styles.gridTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
                                        {title}
                                    </Text>
                                    {subtitle && (
                                        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }, subtitleStyle]} numberOfLines={1}>
                                            {subtitle}
                                        </Text>
                                    )}
                                </View>
                                {rightElement && <View style={styles.rightElement}>{rightElement}</View>}
                            </View>

                            {footer && (
                                <View style={styles.gridFooter}>
                                    {footer}
                                </View>
                            )}
                        </View>
                    </View>
                </Card>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            onPress={onPress}
            onLongPress={onLongPress}
            delayLongPress={500}
            activeOpacity={0.7}
            style={[styles.container, style]}
        >
            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.content}>
                    <View style={styles.imageContainer}>
                        {imageUri ? (
                            <Card.Cover source={{ uri: imageUri }} style={styles.cover} />
                        ) : (
                            <View style={[styles.placeholder, { backgroundColor: theme.colors.surfaceVariant }]}>
                                {placeholderIcon || <ImageIcon size={32} color={appColors.primary} />}
                            </View>
                        )}
                        {coverOverlay}
                    </View>

                    <View style={styles.infoContainer}>
                        <View style={styles.headerRow}>
                            <View style={styles.textContainer}>
                                <Text style={[styles.title, { color: theme.colors.onSurface }]} numberOfLines={1}>
                                    {title}
                                </Text>
                                {subtitle && (
                                    <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }, subtitleStyle]} numberOfLines={1}>
                                        {subtitle}
                                    </Text>
                                )}
                            </View>
                            {rightElement && <View style={styles.rightElement}>{rightElement}</View>}
                        </View>

                        {footer && <View style={styles.footer}>{footer}</View>}
                    </View>
                </View>
            </Card>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    container: {
        marginBottom: 12,
    },
    gridContainer: {
        flex: 1,
        margin: 6,
        marginBottom: 12,
    },
    card: {
        elevation: 2,
        borderRadius: 16,
        overflow: 'hidden',
    },
    content: {
        flexDirection: 'row',
        height: 100,
    },
    imageContainer: {
        width: 100,
        height: 100,
    },
    cover: {
        width: '100%',
        height: '100%',
        borderRadius: 0,
    },
    placeholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoContainer: {
        flex: 1,
        padding: 12,
        justifyContent: 'space-between',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    textContainer: {
        flex: 1,
        marginRight: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 14,
        marginTop: 4,
    },
    rightElement: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    footer: {
        marginTop: 8,
    },
    // Grid Styles
    gridContent: {
        flexDirection: 'column',
        height: 260,
    },
    gridImageContainer: {
        width: '100%',
        height: 160,
    },
    gridCover: {
        width: '100%',
        height: '100%',
        borderRadius: 0,
    },
    gridInfoContainer: {
        flex: 1,
        padding: 12,
        justifyContent: 'space-between',
    },
    gridTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    gridFooter: {
        marginTop: 'auto',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 4,
    },
    badgeOverlay: {
        position: 'absolute',
        top: 8,
        left: 8,
    },
});
