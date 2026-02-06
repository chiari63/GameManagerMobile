import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { Text, Button, TextInput, useTheme } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import Animated, {
    FadeInDown,
    FadeInUp,
    FadeOut,
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    Layout
} from 'react-native-reanimated';
import { Sparkles, Gamepad, Rocket } from 'lucide-react-native';
import { appColors } from '../theme';

const { width } = Dimensions.get('window');

const OnboardingScreen = () => {
    const { completeOnboarding } = useAuth();
    const theme = useTheme();
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');

    const handleNameSubmit = () => {
        if (name.trim()) {
            setStep(2);
        }
    };

    const handleFinalize = async () => {
        await completeOnboarding(name.trim());
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {step === 1 ? (
                <Animated.View
                    key="step1"
                    entering={FadeInDown.duration(800).springify()}
                    exiting={FadeOut.duration(400)}
                    style={styles.content}
                >
                    <View style={styles.iconContainer}>
                        <Sparkles color={appColors.primary} size={64} />
                    </View>

                    <Text style={styles.welcomeTitle}>Olá!</Text>
                    <Text style={styles.subtitle}>
                        Bem-vindo ao Game Manager, seu novo companheiro de coleção.
                    </Text>

                    <View style={styles.inputSection}>
                        <Text style={styles.label}>Como gostaria de ser chamado?</Text>
                        <TextInput
                            mode="flat"
                            placeholder="Seu nome"
                            value={name}
                            onChangeText={setName}
                            style={styles.input}
                            textColor="#ffffff"
                            placeholderTextColor="rgba(255,255,255,0.4)"
                            autoFocus
                            onSubmitEditing={handleNameSubmit}
                        />

                        <Button
                            mode="contained"
                            onPress={handleNameSubmit}
                            disabled={!name.trim()}
                            style={styles.button}
                            contentStyle={styles.buttonContent}
                            labelStyle={styles.buttonLabel}
                        >
                            Próximo
                        </Button>
                    </View>
                </Animated.View>
            ) : (
                <Animated.View
                    key="step2"
                    entering={FadeInUp.duration(800).springify()}
                    style={styles.content}
                >
                    <View style={styles.iconContainer}>
                        <Gamepad color={appColors.primary} size={80} />
                    </View>

                    <Text style={styles.welcomeTitle}>Excelente, {name}!</Text>
                    <Text style={styles.subtitle}>
                        Tudo pronto para você organizar seus consoles, jogos e acessórios de um jeito incrível.
                    </Text>

                    <Text style={styles.warmMessage}>
                        Aproveite cada pixel da sua jornada organizada!
                    </Text>

                    <Button
                        mode="contained"
                        onPress={handleFinalize}
                        style={[styles.button, styles.finalButton]}
                        contentStyle={styles.buttonContent}
                        labelStyle={styles.buttonLabel}
                        icon={() => <Rocket size={20} color="#fff" />}
                    >
                        Vamos Começar!
                    </Button>
                </Animated.View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 32,
        justifyContent: 'center',
    },
    content: {
        alignItems: 'center',
        width: '100%',
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(74, 155, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
    },
    welcomeTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'center',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 18,
        color: '#94a3b8',
        textAlign: 'center',
        lineHeight: 26,
        marginBottom: 48,
    },
    inputSection: {
        width: '100%',
    },
    label: {
        fontSize: 14,
        color: '#94a3b8',
        marginBottom: 12,
        textAlign: 'center',
    },
    input: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        height: 60,
        marginBottom: 24,
        fontSize: 20,
        textAlign: 'center',
    },
    button: {
        borderRadius: 16,
        backgroundColor: appColors.primary,
        elevation: 4,
        shadowColor: appColors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    buttonContent: {
        height: 60,
    },
    buttonLabel: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    warmMessage: {
        fontSize: 16,
        fontStyle: 'italic',
        color: appColors.primary,
        textAlign: 'center',
        marginBottom: 40,
        opacity: 0.9,
    },
    finalButton: {
        width: '100%',
    }
});

export default OnboardingScreen;
