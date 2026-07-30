import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useVendor } from '../../context/VendorContext';
import { supabase } from '../../lib/supabaseClient';

export default function VendorMessagesScreen() {
  const router = useRouter();
  const { user, userData } = useAuth() as any;
  const { vendorProfile } = useVendor() as any;

  const [messages, setMessages] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [customerProfiles, setCustomerProfiles] = useState<Record<string, any>>({});
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const vendorId = useMemo(() => vendorProfile?.id || user?.id, [vendorProfile?.id, user?.id]);
  const vendorName = useMemo(() => {
    return (
      vendorProfile?.business_name ||
      vendorProfile?.name ||
      userData?.business_name ||
      userData?.full_name ||
      user?.full_name ||
      user?.email ||
      'Your Store'
    );
  }, [vendorProfile, userData, user]);

  const loadCustomerProfiles = async (customerIds: string[]) => {
    const ids = Array.from(new Set(customerIds.filter(Boolean)));
    if (!ids.length) return {};

    const { data: profileRows } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, email, phone, username')
      .in('id', ids);

    const { data: customerRows } = await supabase
      .from('customers')
      .select('id, full_name, avatar_url, email, phone, username')
      .in('id', ids);

    const profiles: Record<string, any> = {};

    profileRows?.forEach((row: any) => {
      const key = String(row.id);
      profiles[key] = {
        id: key,
        full_name: row.full_name,
        username: row.username,
        avatar_url: row.avatar_url,
        email: row.email,
        phone: row.phone,
      };
    });

    customerRows?.forEach((row: any) => {
      const key = String(row.id);
      profiles[key] = {
        ...profiles[key],
        id: key,
        full_name: profiles[key]?.full_name || row.full_name,
        username: row.username || profiles[key]?.username,
        avatar_url: row.avatar_url || profiles[key]?.avatar_url,
        email: row.email || profiles[key]?.email,
        phone: row.phone || profiles[key]?.phone,
      };
    });

    await Promise.all(
      Object.keys(profiles).map(async (pid) => {
        const p = profiles[pid];
        if (p?.avatar_url && typeof p.avatar_url === 'string') {
          const val = p.avatar_url;
          if (!val.startsWith('http')) {
            try {
              const { data } = supabase.storage.from('avatar').getPublicUrl(val);
              if (data?.publicUrl) {
                profiles[pid].avatar_url = `${data.publicUrl}?t=${Date.now()}`;
              }
            } catch (e) {
              // fallback
            }
          } else {
            profiles[pid].avatar_url = `${val}?t=${Date.now()}`;
          }
        }
      })
    );

    setCustomerProfiles((prev) => ({ ...prev, ...profiles }));
    return profiles;
  };

  const buildConversations = (messageList: any[]) => {
    const threadMap = new Map<string, any>();

    messageList.forEach((message) => {
      const otherId = String(message.sender_id) === String(vendorId) ? message.receiver_id : message.sender_id;
      const otherKey = otherId ? String(otherId) : '';
      if (!otherKey || otherKey === String(vendorId)) return;

      const current = threadMap.get(otherKey);
      const createdAt = new Date(message.created_at || 0).getTime();
      const customerName = String(message.sender_id) === String(vendorId) ? message.receiver_name || 'Customer' : message.sender_name || 'Customer';

      if (!current || createdAt > current.createdAt) {
        threadMap.set(otherKey, {
          customerId: otherKey,
          customerName,
          latestMessage: message,
          createdAt,
          hasUnread: false,
        });
      }
    });

    return Array.from(threadMap.values()).sort((a, b) => b.createdAt - a.createdAt);
  };

  const refreshMessages = async (activeVendorId = vendorId) => {
    if (!activeVendorId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', `vendor:${activeVendorId}`)
      .order('created_at', { ascending: true });

    if (!error) {
      const messageRows = data || [];
      setMessages(messageRows);

      const nextConversations = buildConversations(messageRows);
      const loadedProfiles = await loadCustomerProfiles(nextConversations.map((c: any) => c.customerId));
      const resolvedProfiles = { ...customerProfiles, ...loadedProfiles };

      setConversations(
        nextConversations.map((c: any) => {
          const profile = resolvedProfiles[String(c.customerId)];
          return {
            ...c,
            customerName:
              profile?.full_name || profile?.username || profile?.email || c.customerName,
            customerAvatar: profile?.avatar_url,
          };
        })
      );

      await Promise.all(nextConversations.map(async (c: any) => {
        const key = String(c.customerId);
        if (!resolvedProfiles[key]) {
          await ensureProfileLoaded(key);
        }
      }));
    }
    setLoading(false);
  };

  const ensureProfileLoaded = async (id: string) => {
    const key = String(id);
    if (!key) return;
    if (customerProfiles[key]) return;

    try {
      const [{ data: pRows }, { data: cRows }] = await Promise.all([
        supabase.from('profiles').select('id, full_name, avatar_url, email, phone, username').eq('id', key),
        supabase.from('customers').select('id, full_name, avatar_url, email, phone, username').eq('id', key),
      ]);

      const profilesObj: Record<string, any> = {};
      pRows?.forEach((r: any) => profilesObj[String(r.id)] = r);
      cRows?.forEach((r: any) => profilesObj[String(r.id)] = { ...(profilesObj[String(r.id)] || {}), ...r });

      const row = profilesObj[key];
      if (row) {
        const avatar = row.avatar_url && typeof row.avatar_url === 'string' ? (row.avatar_url.startsWith('http') ? `${row.avatar_url}?t=${Date.now()}` : (supabase.storage.from('avatar').getPublicUrl(row.avatar_url).data?.publicUrl ? `${supabase.storage.from('avatar').getPublicUrl(row.avatar_url).data.publicUrl}?t=${Date.now()}` : row.avatar_url)) : null;
        setCustomerProfiles((prev) => ({
          ...prev,
          [key]: {
            id: key,
            full_name: row.full_name || prev[key]?.full_name,
            username: row.username || prev[key]?.username,
            avatar_url: avatar || prev[key]?.avatar_url,
            email: row.email || prev[key]?.email,
            phone: row.phone || prev[key]?.phone,
          },
        }));
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    if (!vendorId) return;

    refreshMessages(vendorId);

    const channel = supabase.channel(`vendor-messages-${vendorId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload: any) => {
        const newConversationId = payload?.new?.conversation_id;
        const oldConversationId = payload?.old?.conversation_id;
        if (newConversationId === `vendor:${vendorId}` || oldConversationId === `vendor:${vendorId}`) {
          refreshMessages(vendorId);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [vendorId]);

  useEffect(() => {
    if (!messages || messages.length === 0) return;
    const nextConversations = buildConversations(messages).map((c: any) => ({
      ...c,
      customerName: customerProfiles[String(c.customerId)]?.full_name || c.customerName,
    }));

    setConversations(nextConversations);
  }, [messages, customerProfiles]);

  useEffect(() => {
    if (!selectedCustomerId) return;
    const customerKey = String(selectedCustomerId);
    if (!customerProfiles[customerKey]) {
      ensureProfileLoaded(customerKey);
    }
  }, [selectedCustomerId, customerProfiles]);

  const handleSelectCustomer = async (customerId: string) => {
    setSelectedCustomerId(customerId);
    if (!customerProfiles[String(customerId)]) {
      await ensureProfileLoaded(customerId);
    }

    setConversations((prev) =>
      prev.map((c) => (c.customerId === customerId ? { ...c, hasUnread: false } : c))
    );
  };

  const activeCustomer = selectedCustomerId ? customerProfiles[String(selectedCustomerId)] : null;
  const filteredMessages = selectedCustomerId
    ? messages.filter(
        (message) =>
          String(message.sender_id) === String(selectedCustomerId) || String(message.receiver_id) === String(selectedCustomerId)
      )
    : [];

  const selectedCustomerNameFallback = selectedCustomerId
    ? filteredMessages.find((message) => String(message.sender_id) === String(selectedCustomerId))?.sender_name ||
      filteredMessages.find((message) => String(message.receiver_id) === String(selectedCustomerId))?.receiver_name ||
      'Customer'
    : 'Customer';

  const getAvatarSource = (profile: any) => {
    if (profile?.avatar_url) return { uri: profile.avatar_url };
    return null;
  };

  const getDisplayName = (profile: any, fallbackName: string) => {
    return profile?.full_name || profile?.username || profile?.email || fallbackName || 'Customer';
  };

  const handleSend = async () => {
    if (!input.trim() || !vendorId || !selectedCustomerId) {
      if (!selectedCustomerId) {
        Alert.alert('Select a customer', 'Please select a customer conversation first.');
      }
      return;
    }

    const customerProfile = customerProfiles[String(selectedCustomerId)];
    const { error } = await supabase.from('messages').insert([
      {
        conversation_id: `vendor:${vendorId}`,
        sender_id: vendorId,
        receiver_id: selectedCustomerId,
        sender_name: vendorName,
        receiver_name: getDisplayName(customerProfile, 'Customer'),
        content: input.trim(),
      },
    ]);

    if (error) {
      Alert.alert('Message failed', error.message);
      return;
    }

    setInput('');
    await refreshMessages(vendorId);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const renderAvatar = (profile: any, fallbackName: string, size = 44) => {
    const source = getAvatarSource(profile);
    const initial = getDisplayName(profile, fallbackName)?.[0]?.toUpperCase() || 'C';

    return (
      <View style={[styles.avatarWrapper, { width: size, height: size, borderRadius: size / 2 }]}>
        {source ? (
          <Image source={source} style={{ width: size, height: size, borderRadius: size / 2 }} />
        ) : (
          <View style={[styles.avatarPlaceholder, { width: size, height: size, borderRadius: size / 2 }]}>
            <Text style={[styles.avatarInitial, { fontSize: size * 0.4 }]}>{initial}</Text>
          </View>
        )}
      </View>
    );
  };

  if (selectedCustomerId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="light-content" backgroundColor="#f97316" />

        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedCustomerId(null)} style={styles.headerBackButton} activeOpacity={0.7}>
            <Feather name="arrow-left" size={20} color="#1f2937" />
          </TouchableOpacity>
          {renderAvatar(activeCustomer, selectedCustomerNameFallback, 38)}
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {getDisplayName(activeCustomer, selectedCustomerNameFallback)}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {activeCustomer?.email || activeCustomer?.phone || 'Active customer'}
            </Text>
          </View>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.chatBody}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
          >
            {loading && messages.length === 0 ? (
              <Text style={styles.emptyState}>Loading conversation...</Text>
            ) : filteredMessages.length === 0 ? (
              <Text style={styles.emptyState}>Say hello to start chatting!</Text>
            ) : (
              filteredMessages.map((message, index) => {
                const isVendor = String(message.sender_id) === String(vendorId);
                const profile = isVendor
                  ? { full_name: vendorName, avatar_url: vendorProfile?.avatar_url || userData?.avatar_url }
                  : activeCustomer || { full_name: message.sender_name || 'Customer', avatar_url: undefined };

                return (
                  <View key={message.id || index} style={[styles.messageRow, isVendor ? styles.messageRowRight : styles.messageRowLeft]}>
                    {!isVendor && renderAvatar(profile, message.sender_name || 'Customer', 28)}
                    <View style={[styles.bubble, isVendor ? styles.bubbleVendor : styles.bubbleCustomer]}>
                      <Text style={[styles.bubbleText, isVendor && styles.bubbleTextVendor]}>{message.content}</Text>
                      <Text style={[styles.metaText, isVendor ? styles.metaTextVendor : styles.metaTextCustomer]}>
                        {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          <View style={styles.inputRow}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Type a message..."
              placeholderTextColor="#9ca3af"
              multiline
              style={styles.input}
            />
            <TouchableOpacity style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]} onPress={handleSend} activeOpacity={0.8}>
              <Feather name="send" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#f97316" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.inboxListContainer}>
        {conversations.length === 0 ? (
          <View style={styles.emptyInbox}>
            <Feather name="message-square" size={48} color="#d1d5db" />
            <Text style={styles.emptyInboxTitle}>No messages yet</Text>
            <Text style={styles.emptyInboxSubtitle}>When customers message your store, chats will appear here.</Text>
          </View>
        ) : (
          conversations.map((conversation) => {
            const profile = customerProfiles[conversation.customerId] || {
              full_name: conversation.customerName,
              avatar_url: conversation.customerAvatar,
            };
            const isUnread = conversation.hasUnread;

            return (
              <TouchableOpacity
                key={conversation.customerId}
                style={[styles.chatListItem, isUnread ? styles.chatListItemUnread : styles.chatListItemRead]}
                onPress={() => handleSelectCustomer(conversation.customerId)}
                activeOpacity={0.7}
              >
                <View style={{ position: 'relative' }}>
                  {renderAvatar(profile, conversation.customerName, 52)}
                  {isUnread && <View style={styles.unreadDot} />}
                </View>

                <View style={styles.chatListMeta}>
                  <View style={styles.chatListTopRow}>
                    <Text style={[styles.chatListName, isUnread && styles.chatListNameUnread]} numberOfLines={1}>
                      {getDisplayName(profile, conversation.customerName)}
                    </Text>
                    <Text style={[styles.chatListTime, isUnread && styles.chatListTimeUnread]}>
                      {new Date(conversation.latestMessage?.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <Text style={[styles.chatListPreview, isUnread && styles.chatListPreviewUnread]} numberOfLines={1}>
                    {String(conversation.latestMessage?.sender_id) === String(vendorId) ? 'You: ' : ''}
                    {conversation.latestMessage?.content || 'No message yet'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#fff',
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  inboxListContainer: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  chatListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    borderRadius: 12,
  },
  chatListItemUnread: {
    backgroundColor: '#fff7ed',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
  },
  chatListItemRead: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chatListMeta: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  chatListTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatListName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
    marginRight: 8,
  },
  chatListNameUnread: {
    fontWeight: '700',
    color: '#111827',
  },
  chatListTime: {
    fontSize: 11,
    color: '#9ca3af',
  },
  chatListTimeUnread: {
    color: '#f97316',
    fontWeight: '600',
  },
  chatListPreview: {
    fontSize: 13,
    color: '#6b7280',
  },
  chatListPreviewUnread: {
    color: '#1f2937',
    fontWeight: '600',
  },
  unreadDot: {
    position: 'absolute',
    right: 2,
    top: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#f97316',
    borderWidth: 2,
    borderColor: '#fff',
  },
  chatBody: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  messageRowLeft: {
    justifyContent: 'flex-start',
  },
  messageRowRight: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    marginHorizontal: 8,
  },
  bubbleVendor: {
    backgroundColor: '#f97316',
    borderBottomRightRadius: 4,
  },
  bubbleCustomer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 20,
  },
  bubbleTextVendor: {
    color: '#fff',
  },
  metaText: {
    fontSize: 10,
    marginTop: 4,
  },
  metaTextVendor: {
    color: '#ffedd5',
    textAlign: 'right',
  },
  metaTextCustomer: {
    color: '#9ca3af',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: '#1f2937',
    fontSize: 14,
    marginRight: 8,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#d1d5db',
  },
  avatarWrapper: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  avatarPlaceholder: {
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#4b5563',
    fontWeight: '700',
  },
  emptyState: {
    color: '#6b7280',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 40,
    fontWeight: '500',
  },
  emptyInbox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 120,
    paddingHorizontal: 32,
  },
  emptyInboxTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 16,
  },
  emptyInboxSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});