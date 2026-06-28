import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Appearance, StatusBar } from 'react-native';
import { Text, useTheme, ActivityIndicator, Badge } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';
import { useHomeStore } from '../store/useHomeStore';
import { useThemeStore } from '../store/useThemeStore';
import { memberService } from '../services/memberService';
import { notificationService } from '../services/notificationService';
import LoginScreen from '../screens/auth/LoginScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import CreateHomeScreen from '../screens/onboarding/CreateHomeScreen';
import PendingInvitationsScreen from '../screens/onboarding/PendingInvitationsScreen';
import KitchenScreen from '../screens/kitchen/KitchenScreen';
import MarketScreen from '../screens/market/MarketScreen';
import InsightsScreen from '../screens/insights/InsightsScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import HomeDetailScreen from '../screens/settings/HomeDetailScreen';
import InvitationsScreen from '../screens/settings/InvitationsScreen';
import NotificationsScreen from '../screens/settings/NotificationsScreen';

const Stack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();
const OnboardingStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const SettingsStack = createNativeStackNavigator();

function AuthNavigator() {
    return (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
            <AuthStack.Screen name="Login" component={LoginScreen} />
            <AuthStack.Screen name="SignUp" component={SignUpScreen} />
            <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </AuthStack.Navigator>
    );
}

function OnboardingNavigator() {
    return (
        <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
            <OnboardingStack.Screen name="Welcome" component={WelcomeScreen} />
            <OnboardingStack.Screen name="CreateHome" component={CreateHomeScreen} />
            <OnboardingStack.Screen name="PendingInvitations" component={PendingInvitationsScreen} />
        </OnboardingStack.Navigator>
    );
}

function SettingsNavigator() {
    return (
        <SettingsStack.Navigator screenOptions={{ headerShown: false }}>
            <SettingsStack.Screen name="SettingsMain" component={SettingsScreen} />
            <SettingsStack.Screen name="HomeDetail" component={HomeDetailScreen} />
            <SettingsStack.Screen name="Invitations" component={InvitationsScreen} />
            <SettingsStack.Screen name="Notifications" component={NotificationsScreen} />
        </SettingsStack.Navigator>
    );
}

function MainTabs() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();

    // Fetch pending invitations for badge
    const { data: pendingInvitations = [] } = useQuery({
        queryKey: ['user-invitations', user?.email],
        queryFn: () => memberService.getUserPendingInvitations(user!.email!),
        enabled: !!user?.email,
        refetchInterval: 30000, // Refresh every 30s
    });

    // Fetch unread notifications count for badge
    const { data: unreadNotificationCount = 0 } = useQuery({
        queryKey: ['unread-notifications', user?.id],
        queryFn: () => notificationService.getUnreadCount(user!.id),
        enabled: !!user?.id,
        refetchInterval: 30000, // Refresh every 30s
    });

    const invitationCount = pendingInvitations.length;
    const totalBadgeCount = invitationCount + unreadNotificationCount;

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
                tabBarStyle: {
                    backgroundColor: theme.colors.surface,
                    borderTopColor: theme.colors.outline,
                    paddingTop: 8,
                    paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
                    height: 60 + (insets.bottom > 0 ? insets.bottom : 8),
                    elevation: 8,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                    marginTop: 2,
                },
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: string = 'home';

                    if (route.name === 'Kitchen') {
                        iconName = focused ? 'home-variant' : 'home-variant-outline';
                    } else if (route.name === 'Market') {
                        iconName = focused ? 'cart' : 'cart-outline';
                    } else if (route.name === 'Insights') {
                        iconName = focused ? 'chart-line' : 'chart-line-variant';
                    } else if (route.name === 'SettingsTab') {
                        iconName = focused ? 'cog' : 'cog-outline';
                    }

                    return (
                        <View>
                            <MaterialCommunityIcons
                                name={iconName as any}
                                size={24}
                                color={color}
                            />
                            {route.name === 'SettingsTab' && totalBadgeCount > 0 && (
                                <Badge
                                    size={16}
                                    style={{
                                        position: 'absolute',
                                        top: -4,
                                        right: -8,
                                        backgroundColor: theme.colors.error,
                                    }}
                                >
                                    {totalBadgeCount > 99 ? '99+' : totalBadgeCount}
                                </Badge>
                            )}
                        </View>
                    );
                },
            })}
        >
            <Tab.Screen
                name="Kitchen"
                component={KitchenScreen}
                options={{
                    tabBarLabel: 'Kitchen',
                }}
            />
            <Tab.Screen
                name="Market"
                component={MarketScreen}
                options={{
                    tabBarLabel: 'Shopping',
                    tabBarBadge: undefined, // Could show count of items to buy
                }}
            />
            <Tab.Screen
                name="Insights"
                component={InsightsScreen}
                options={{
                    tabBarLabel: 'Insights',
                }}
            />
            <Tab.Screen
                name="SettingsTab"
                component={SettingsNavigator}
                options={{
                    tabBarLabel: 'Settings',
                }}
            />
        </Tab.Navigator>
    );
}

function LoadingScreen() {
    const theme = useTheme();

    return (
        <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: theme.colors.background,
        }}>
            <View style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: theme.colors.primaryContainer,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 24,
            }}>
                <MaterialCommunityIcons
                    name="home-variant"
                    size={40}
                    color={theme.colors.primary}
                />
            </View>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text
                variant="bodyLarge"
                style={{ marginTop: 16, color: theme.colors.onSurfaceVariant }}
            >
                Loading...
            </Text>
        </View>
    );
}

export default function AppNavigator() {
    const { session, isLoading: authLoading, initialize } = useAuthStore();
    const { currentHome, isLoading: homeLoading, refreshHomes } = useHomeStore();
    const { effectiveTheme, syncSystemTheme } = useThemeStore();
    const theme = useTheme();

    useEffect(() => {
        initialize();

        // Listen for system theme changes
        const subscription = Appearance.addChangeListener(() => {
            syncSystemTheme();
        });

        return () => subscription.remove();
    }, []);

    useEffect(() => {
        if (session?.user) {
            refreshHomes(session.user.id);
        }
    }, [session]);

    // Create navigation theme based on paper theme
    const navigationTheme = {
        ...(effectiveTheme === 'dark' ? DarkTheme : DefaultTheme),
        colors: {
            ...(effectiveTheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
            background: theme.colors.background,
            card: theme.colors.surface,
            text: theme.colors.onSurface,
            border: theme.colors.outline,
            primary: theme.colors.primary,
        },
    };

    if (authLoading || (session && homeLoading)) {
        return <LoadingScreen />;
    }

    return (
        <>
            <StatusBar
                barStyle={effectiveTheme === 'dark' ? 'light-content' : 'dark-content'}
                backgroundColor={theme.colors.background}
            />
            <NavigationContainer theme={navigationTheme}>
                <Stack.Navigator screenOptions={{ headerShown: false }}>
                    {!session ? (
                        <Stack.Screen name="Auth" component={AuthNavigator} />
                    ) : !currentHome ? (
                        <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
                    ) : (
                        <Stack.Screen name="App" component={MainTabs} />
                    )}
                </Stack.Navigator>
            </NavigationContainer>
        </>
    );
}
