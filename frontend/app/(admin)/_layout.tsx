import React, { useContext } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs, Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { Theme } from '../../constants/Theme';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function AdminLayout() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Theme.colors.background }}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  if (!user || user.role !== 'admin') {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Theme.colors.primary,
        tabBarInactiveTintColor: Theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Theme.colors.surface,
          borderTopColor: Theme.colors.border,
        },
        headerStyle: {
          backgroundColor: Theme.colors.surface,
        },
        headerTintColor: Theme.colors.text,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard (ダッシュボード)',
          tabBarIcon: ({ color }) => <TabBarIcon name="dashboard" color={color} />,
        }}
      />
      <Tabs.Screen
        name="students"
        options={{
          title: 'Students (学生)',
          tabBarIcon: ({ color }) => <TabBarIcon name="users" color={color} />,
        }}
      />
      <Tabs.Screen
        name="certificates"
        options={{
          title: 'Certificates (証明書)',
          tabBarIcon: ({ color }) => <TabBarIcon name="certificate" color={color} />,
        }}
      />
      <Tabs.Screen
        name="upload-video"
        options={{
          title: 'Upload Video (アップロード)',
          tabBarIcon: ({ color }) => <TabBarIcon name="upload" color={color} />,
        }}
      />
      <Tabs.Screen
        name="manage-videos"
        options={{
          title: 'Videos (動画管理)',
          tabBarIcon: ({ color }) => <TabBarIcon name="film" color={color} />,
        }}
      />
    </Tabs>
  );
}
