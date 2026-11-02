import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useSession } from '../lib/useSession';

export default function Index() {
  const { isLoading, isAuthenticated } = useSession();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <ActivityIndicator size="large" color="#60a5fa" />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/main" />;
  }

  return <Redirect href="/(auth)/login" />;
}
