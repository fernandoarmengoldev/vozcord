import { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import Modal from './Modal';
import { UserAvatar } from './UserAvatar';
import { SearchIcon, CloseIcon } from './Icons';
import { apiFetch } from '../../lib/api';

type User = {
  id: number;
  name: string | null;
  email: string;
  avatarUrl: string | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelectUser: (user: User) => void;
  title?: string;
  subtitle?: string;
};

export default function UserSearchModal({
  visible,
  onClose,
  onSelectUser,
  title = 'Buscar usuario',
  subtitle = 'Busca por nombre o email'
}: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch(`/users/search?q=${encodeURIComponent(query)}`, {
          method: 'GET',
          auth: true,
        });
        if (res.ok) {
          const data = (await res.json()) as { users: User[] };
          setResults(data.users);
        } else {
          const errorData = await res.json().catch(() => ({}));
          console.error('Search error:', errorData);
          setError(errorData.error || 'Error al buscar usuarios');
          setResults([]);
        }
      } catch (err) {
        setError('Error de conexión');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectUser = (user: User) => {
    onSelectUser(user);
    setQuery('');
    setResults([]);
    onClose();
  };

  const handleClose = () => {
    setQuery('');
    setResults([]);
    setError(null);
    onClose();
  };

  return (
    <Modal visible={visible} onClose={handleClose} title={title}>
      <View className="w-full">
        <Text className="text-sm text-slate-400 mb-4">{subtitle}</Text>

        <View className="relative mb-4">
          <View className="absolute left-3 top-3.5 z-10">
            <SearchIcon size={20} color="#94a3b8" />
          </View>
          <TextInput
            className="bg-slate-900/50 border border-slate-600/50 rounded-xl pl-11 pr-4 py-3 text-slate-100 text-base"
            placeholder="Escribe para buscar..."
            placeholderTextColor="#64748b"
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
        </View>

        <View className="max-h-96">
          {loading ? (
            <View className="py-12 items-center">
              <ActivityIndicator size="large" color="#60a5fa" />
              <Text className="text-slate-400 text-sm mt-4">Buscando...</Text>
            </View>
          ) : error ? (
            <View className="py-12 items-center">
              <Text className="text-red-400 text-sm">{error}</Text>
            </View>
          ) : !query.trim() ? (
            <View className="py-12 items-center">
              <SearchIcon size={48} color="#475569" />
              <Text className="text-slate-400 text-sm mt-4 text-center">
                Comienza a escribir para buscar usuarios
              </Text>
            </View>
          ) : results.length === 0 ? (
            <View className="py-12 items-center">
              <Text className="text-slate-400 text-sm">No se encontraron usuarios</Text>
            </View>
          ) : (
            <ScrollView
              className="flex-1"
              showsVerticalScrollIndicator={false}
            >
              {results.map((user) => (
                <Pressable
                  key={user.id}
                  onPress={() => handleSelectUser(user)}
                  className="flex-row items-center gap-3 p-3 rounded-lg bg-slate-900/30 border border-slate-700/50 mb-2 active:bg-slate-700/50"
                >
                  <UserAvatar
                    avatarUrl={user.avatarUrl}
                    size={40}
                    fallbackText={user.name || user.email}
                    fallbackColor="#60a5fa"
                  />
                  <View className="flex-1">
                    <Text className="text-slate-50 font-medium" numberOfLines={1}>
                      {user.name || user.email}
                    </Text>
                    {user.name && (
                      <Text className="text-slate-400 text-sm" numberOfLines={1}>
                        {user.email}
                      </Text>
                    )}
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
