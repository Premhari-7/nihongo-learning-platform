import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, Text, View, TextInput, Animated, ScrollView } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Theme } from '../constants/Theme';
import { API_URL } from '../context/AuthContext';
import axios from 'axios';

export default function ChatbotWidget() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<{ id: string; text: string; sender: 'user' | 'ai' }[]>([
      { id: '1', text: 'Konnichiwa! I am Jin Sakai. How can I guide your Japanese journey?', sender: 'ai' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isAwake, setIsAwake] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const zzzAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
      const timer = setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
      return () => clearTimeout(timer);
  }, [messages]);

  useEffect(() => {
      if (!isChatOpen) {
          zzzAnim.setValue(0);
          Animated.loop(
              Animated.timing(zzzAnim, {
                  toValue: 1,
                  duration: 2500,
                  useNativeDriver: false,
              })
          ).start();
      } else {
          zzzAnim.stopAnimation();
      }
  }, [isChatOpen]);

  const sendMessage = async () => {
      if (!inputText.trim()) return;
      const userText = inputText;
      setMessages(prev => [...prev, { id: Date.now().toString(), text: userText, sender: 'user' }]);
      setInputText('');
      setIsAwake(true);
      setIsTyping(true);
      
      try {
          const res = await axios.post(`${API_URL}/chat`, { message: userText });
          setMessages(prev => [...prev, { id: Date.now().toString(), text: res.data.reply, sender: 'ai' }]);
      } catch (err) {
          setMessages(prev => [...prev, { id: Date.now().toString(), text: 'My sword is sharp, but my connection is weak. Try again.', sender: 'ai' }]);
      } finally {
          setIsTyping(false);
          setTimeout(() => setIsAwake(false), 5000);
      }
  };

  return (
      <View style={styles.assistantContainer}>
        {/* Chat Box Popup */}
        {isChatOpen && (
          <View style={styles.chatBox}>
            <View style={styles.chatHeader}>
                <Text style={styles.chatTitle}>Jin Sakai</Text>
                <TouchableOpacity onPress={() => setIsChatOpen(false)}>
                    <FontAwesome name="times" size={20} color="#fff" />
                </TouchableOpacity>
            </View>
            <ScrollView 
                ref={scrollViewRef} 
                style={styles.messagesContainer} 
                contentContainerStyle={{ paddingBottom: 20 }}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={true}
            >
                {messages.map(msg => (
                    <View key={msg.id} style={[styles.bubble, msg.sender === 'user' ? styles.userBubble : styles.aiBubble]}>
                        <Text style={styles.bubbleText}>{msg.text}</Text>
                    </View>
                ))}
                {isTyping && (
                    <Text style={{color: Theme.colors.primary, fontSize: 12, marginLeft: 10}}>Jin is sharpening his blade...</Text>
                )}
            </ScrollView>
            <View style={styles.inputArea}>
                <TextInput
                    style={[styles.input, { outlineStyle: 'none', paddingVertical: 0 } as any]}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="Ask a question..."
                    placeholderTextColor="#666"
                    onSubmitEditing={sendMessage}
                    multiline={false}
                />
                <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
                    <FontAwesome name="paper-plane" size={16} color="#fff" />
                </TouchableOpacity>
            </View>
          </View>
        )}
        
        <TouchableOpacity 
            style={styles.samuraiTrigger} 
            onPress={() => setIsChatOpen(!isChatOpen)}
            activeOpacity={1}
        >
            {!isChatOpen && (
                <View pointerEvents="none" style={styles.zzzContainer}>
                    {/* Small z */}
                    <Animated.Text style={[styles.zzzText, { 
                        opacity: zzzAnim.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, 0] }),
                        transform: [
                            { translateY: zzzAnim.interpolate({ inputRange: [0, 1], outputRange: [10, -30] }) },
                            { translateX: zzzAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }
                        ]
                    }]}>z</Animated.Text>
                    {/* Big Z */}
                    <Animated.Text style={[styles.zzzText, { fontSize: 24,
                        opacity: zzzAnim.interpolate({ inputRange: [0, 0.4, 0.9, 1], outputRange: [0, 0, 1, 0] }),
                        transform: [
                            { translateY: zzzAnim.interpolate({ inputRange: [0, 1], outputRange: [20, -50] }) },
                            { translateX: zzzAnim.interpolate({ inputRange: [0, 1], outputRange: [5, 20] }) }
                        ]
                    }]}>Z</Animated.Text>
                </View>
            )}
            
            {/* Wrapper view to handle image rendering */}
            <View style={{
                transform: [
                    { translateY: 0 }
                ]
            }}>
                <Animated.Image 
                    source={(!isChatOpen && !isAwake) ? require('../assets/images/jin_sakai_sleep.png') : require('../assets/images/jin_sakai_awake.png')} 
                    style={[styles.samuraiImage, {
                        transform: [
                            // Continuous breathing animation only when sleeping
                            { scale: (!isChatOpen && !isAwake) ? zzzAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.05, 1] }) : 1 },
                            { rotate: (!isChatOpen && !isAwake) ? zzzAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-3deg', '3deg', '-3deg'] }) : '0deg' }
                        ]
                    }]} 
                    resizeMode="cover"
                />
            </View>
        </TouchableOpacity>
      </View>
  );
}

const styles = StyleSheet.create({
  assistantContainer: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    alignItems: 'flex-end',
    zIndex: 1000,
  },
  samuraiTrigger: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 2,
    borderColor: Theme.colors.primary,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  samuraiImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  chatBox: {
    width: 300,
    height: 400,
    backgroundColor: '#1A1410',
    borderRadius: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(155,28,28,0.4)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 15,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  chatTitle: {
    color: Theme.colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  messagesContainer: {
    flex: 1,
    padding: 10,
  },
  bubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 15,
    marginBottom: 10,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Theme.colors.primary,
    borderBottomRightRadius: 5,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#2E2218',
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(155,28,28,0.3)',
  },
  bubbleText: {
    color: '#fff',
    fontSize: 14,
    flexShrink: 1,
  },
  inputArea: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(155,28,28,0.3)',
    backgroundColor: '#0D0A08',
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: 40,
    backgroundColor: '#2E2218',
    borderRadius: 20,
    paddingHorizontal: 15,
    color: '#F0E6D3',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(155,28,28,0.4)',
    fontSize: 14,
  },
  sendButton: {
    width: 40,
    height: 40,
    backgroundColor: Theme.colors.primary,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zzzContainer: {
    position: 'absolute',
    top: 10,
    right: 30,
    width: 50,
    height: 50,
    zIndex: 10,
  },
  zzzText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    position: 'absolute',
    textShadowColor: Theme.colors.primary,
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 5,
  }
});
