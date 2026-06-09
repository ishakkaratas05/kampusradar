import { Tabs } from 'expo-router';
import { LayoutDashboard, Settings } from 'lucide-react-native';
import { Image, View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function OrganizerTabLayout() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        header: () => (
          <View style={{
            paddingTop: insets.top + 8,
            backgroundColor: '#0f172a',
            borderBottomColor: '#1e293b',
            borderBottomWidth: 1,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingBottom: 12,
          }}>
            <Image
              source={{ uri: 'https://vwtzkppabmkncbsthgdw.supabase.co/storage/v1/object/public/public-assets/applogo/logo_kampusradar.png' }}
              style={{ width: 36, height: 36, marginRight: 8 }}
              resizeMode="contain"
            />
            <Text style={{
              fontSize: 18,
              fontWeight: '800',
              color: '#ffffff',
              letterSpacing: -0.3,
            }}>
              KampüsRadar
            </Text>
          </View>
        ),
        tabBarActiveTintColor: '#0284c7',
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.backgroundElement,
          borderTopColor: colors.backgroundSelected,
          borderTopWidth: 1,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          height: 52 + Math.max(insets.bottom, 8),
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Panel',
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
