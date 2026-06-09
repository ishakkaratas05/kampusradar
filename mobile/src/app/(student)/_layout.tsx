import { Tabs } from 'expo-router';
import { Home, Compass, UserCircle, Radar } from 'lucide-react-native';
import { Image, View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { profile, user, setGuestMode } = useAuth();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const guestTabListener = {
    tabPress: (e: any) => {
      if (!user) {
        e.preventDefault();
        setGuestMode?.(false);
      }
    },
  };

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
        tabBarActiveTintColor: colors.text,
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
          title: 'Kampüsüm',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
        listeners={guestTabListener}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Keşfet',
          tabBarIcon: ({ color, size }) => <Compass size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="radar"
        options={{
          title: 'Radar',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Radar size={size} color={color} />,
        }}
        listeners={guestTabListener}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size, focused }) => {
            if (profile?.logo_url) {
              return (
                <View style={{
                  width: size + 4,
                  height: size + 4,
                  borderRadius: (size + 4) / 2,
                  borderWidth: focused ? 2 : 0,
                  borderColor: color,
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <Image 
                    source={{ uri: profile.logo_url }} 
                    style={{ 
                      width: focused ? size : size + 2, 
                      height: focused ? size : size + 2, 
                      borderRadius: (size + 2) / 2 
                    }} 
                  />
                </View>
              );
            }
            return <UserCircle size={size} color={color} />;
          },
        }}
        listeners={guestTabListener}
      />
    </Tabs>
  );
}
