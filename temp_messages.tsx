/*import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
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
import { useAuth } from '../../context/AuthContext';
import { useVendor } from '../../context/VendorContext';
import { supabase } from '../../lib/supabaseClient';

export default function VendorMessagesScreen() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { vendorProfile } = useVendor() as any;

  const [messages, setMessages] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [customerProfiles, setCustomerProfiles] = useState<Record<string, any>>({});
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

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

  const buildConversations = (messageList: any[]) => {
    const threadMap = new Map<string, any>();

    messageList.forEach((message) => {
      const otherId = message.sender_id === vendorId ? message.receiver_id : message.sender_id;
      if (!otherId || otherId === vendorId) return;

      const current = threadMap.get(otherId);
      const createdAt = new Date(message.created_at || 0).getTime();
      const customerName = message.sender_id === vendorId ? message.receiver_name || 'Customer' : message.sender_name || 'Customer';

      if (!current || createdAt > current.createdAt) {
        threadMap.set(otherId, {
          customerId: otherId,
          customerName,
          latestMessage: message,
          createdAt,
        });
      }
    });

    return Array.from(threadMap.values()).sort((a, b) => b.createdAt - a.createdAt);
  };

  const loadCustomerProfiles = async (customerIds: string[]) => {
    const ids = Array.from(new Set(customerIds.filter(Boolean)));
    if (!ids.length) return;

    const { data: profileRows } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, email')
      .in('id', ids);

    const { data: customerRows } = await supabase
      .from('customers')
      .select('id, full_name, avatar_url, email')
      .in('id', ids);

    const profiles: Record<string, any> = {};

    profileRows?.forEach((row: any) => {
      profiles[row.id] = {
        id: row.id,
        full_name: row.full_name,
        avatar_url: row.avatar_url,
        email: row.email,
      };
    });

    customerRows?.forEach((row: any) => {
      profiles[row.id] = {
        ...profiles[row.id],
        id: row.id,
        full_name: row.full_name || profiles[row.id]?.full_name,
        avatar_url: row.avatar_url || profiles[row.id]?.avatar_url,
        email: row.email || profiles[row.id]?.email,
      };
    });

    setCustomerProfiles((prev) => ({ ...prev, ...profiles }));
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
      setConversations(nextConversations);
      if (!selectedCustomerId || !nextConversations.some((c: any) => c.customerId === selectedCustomerId)) {
        setSelectedCustomerId(nextConversations[0]?.customerId || null);
      }
      await loadCustomerProfiles(nextConversations.map((c: any) => c.customerId));
    }
    setLoading(false);
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

  const activeCustomer = selectedCustomerId ? customerProfiles[selectedCustomerId] : null;
  const filteredMessages = selectedCustomerId
    ? messages.filter((message) =>
        message.sender_id === selectedCustomerId || message.receiver_id === selectedCustomerId
      )
    : [];

  const getAvatarSource = (profile: any) => {
    if (profile?.avatar_url) return { uri: profile.avatar_url };
    return null;
  };

  const getDisplayName = (profile: any, fallbackName: string) => {
    return profile?.full_name || profile?.email || fallbackName || 'Customer';
  };

  const handleSend = async () => {
    if (!input.trim() || !vendorId || !selectedCustomerId) {
      if (!selectedCustomerId) {
        Alert.alert('Select a customer', 'Please select a customer conversation first.');
      }
      return;
    }

    const customerProfile = customerProfiles[selectedCustomerId];
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
  };

  const renderAvatar = (profile: any, fallbackName: string) => {
    const source = getAvatarSource(profile);
    const initial = getDisplayName(profile, fallbackName)[0]?.toUpperCase() || 'C';

    return (
      <View style={styles.avatarWrapper}>
        {source ? (
          <Image source={source} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#C2410C" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Feather name="arrow-left" size={20} color="#C2410C" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Customer Messages</Text>
          <Text style={styles.headerSubtitle}>Track conversations by customer with profiles.</Text>
        </View>
      </View>

      <View style={styles.conversationBar}>\n        {activeCustomer ? (\n          <View style={styles.customerProfileRow}>\n            {renderAvatar(activeCustomer, activeCustomer?.full_name || 'Customer')}\n            <View style={styles.customerProfileInfo}>\n              <Text style={styles.customerProfileName}>{getDisplayName(activeCustomer, 'Customer')}</Text>\n              <Text style={styles.customerProfileDetail}>{activeCustomer?.email || 'No email available'}</Text>\n              <Text style={styles.customerProfileDetail}>{activeCustomer?.phone || activeCustomer?.mobile || 'No phone available'}</Text>\n            </View>\n          </View>\n        ) : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.conversationScroll}>
          {conversations.length === 0 ? (
            <View style={styles.emptyConversationTab}>
              <Text style={styles.emptyConversationText}>No active conversations yet.</Text>
            </View>
          ) : (
            conversations.map((conversation) => {
              const isActive = conversation.customerId === selectedCustomerId;
              const profile = customerProfiles[conversation.customerId] || {};
              return (
                <TouchableOpacity
                  key={conversation.customerId}
                  style={[styles.conversationTab, isActive && styles.conversationTabActive]}
                  onPress={() => setSelectedCustomerId(conversation.customerId)}
                  activeOpacity={0.8}
                >
                  {renderAvatar(profile, conversation.customerName)}
                  <View style={styles.conversationMeta}>
                    <Text style={[styles.conversationName, isActive && styles.conversationNameActive]} numberOfLines={1}>
                      {getDisplayName(profile, conversation.customerName)}
                    </Text>
                    <Text style={styles.conversationPreview} numberOfLines={1}>
                      {conversation.latestMessage?.content || 'No message yet'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.chatBody} keyboardShouldPersistTaps="handled">
          {loading ? (
            <Text style={styles.emptyState}>Loading messages...</Text>
          ) : !selectedCustomerId ? (
            <Text style={styles.emptyState}>Select a customer conversation to continue.</Text>
          ) : filteredMessages.length === 0 ? (
            <Text style={styles.emptyState}>No messages with this customer yet.</Text>
          ) : (
            filteredMessages.map((message, index) => {
              const isVendor = message.sender_id === vendorId;
              const customerId = message.sender_id === vendorId ? message.receiver_id : message.sender_id;
              const profile = isVendor
                ? { full_name: vendorName, avatar_url: vendorProfile?.avatar_url || userData?.avatar_url }
                : customerProfiles[customerId] || { full_name: message.sender_name, email: message.sender_name };

              return (
                <View key={message.id || index} style={[styles.messageRow, isVendor ? styles.messageRowRight : styles.messageRowLeft]}>
                  {!isVendor && renderAvatar(profile, message.sender_name || 'Customer')}
                  <View style={[styles.bubble, isVendor ? styles.bubbleVendor : styles.bubbleCustomer]}>
                    <Text style={[styles.bubbleText, isVendor && styles.bubbleTextVendor]}>{message.content}</Text>
                    <Text style={[styles.metaText, isVendor ? styles.metaTextVendor : styles.metaTextCustomer]}>
                      {isVendor ? 'You' : getDisplayName(profile, message.sender_name || 'Customer')}
                    </Text>
                  </View>
                  {isVendor && renderAvatar(profile, vendorName)}
                </View>
              );
            })
          )}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={selectedCustomerId ? 'Reply to customer...' : 'Select a conversation first'}
            placeholderTextColor="#94A3B8"
            multiline
            editable={Boolean(selectedCustomerId)}
            style={styles.input}
          />
          <TouchableOpacity style={[styles.sendBtn, !selectedCustomerId && styles.sendBtnDisabled]} onPress={handleSend} activeOpacity={0.8}>
            <Feather name="send" size={16} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 24 : 14,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7ED',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  headerSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  conversationBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  conversationScroll: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  conversationTab: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 10,
    minWidth: 180,
  },
  conversationTabActive: {
    backgroundColor: '#C2410C',
    borderColor: '#C2410C',
  },
  conversationMeta: {
    marginLeft: 10,
    flex: 1,
  },
  conversationName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  conversationNameActive: {
    color: '#FFFFFF',
  },
  conversationPreview: {
    marginTop: 4,
    fontSize: 11,
    color: '#64748B',
  },
  emptyConversationTab: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  emptyConversationText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  chatBody: { flexGrow: 1, padding: 16, paddingBottom: 24 },
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
  bubble: { maxWidth: '78%', padding: 12, borderRadius: 18, marginBottom: 4 },
  bubbleVendor: { backgroundColor: '#C2410C' },
  bubbleCustomer: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  bubbleText: { color: '#111827', fontSize: 14, fontWeight: '600', lineHeight: 20 },
  bubbleTextVendor: { color: '#FFFFFF' },
  metaText: { marginTop: 6, fontSize: 11, fontWeight: '600' },
  metaTextVendor: { color: '#FFE7D9', textAlign: 'right' },
  metaTextCustomer: { color: '#64748B' },
  avatarWrapper: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', backgroundColor: '#E2E8F0' },
  avatarImage: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { color: '#475569', fontSize: 14, fontWeight: '800' },
  emptyState: { color: '#64748B', fontSize: 13, textAlign: 'center', paddingVertical: 24, fontWeight: '600' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#111827', marginRight: 8 },
  sendBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#C2410C', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#94A3B8' },
});


*/