import React, { useState, useRef, useEffect } from 'react';
import { Button, Card, Input, Typography, Spin, Space, Avatar } from 'antd';
import { MessageOutlined, CloseOutlined, SendOutlined, RobotFilled } from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import axiosClient from '../api/axiosClient';

const { Text } = Typography;

const ChatbotWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { sender: 'ai', text: 'Xin chào! Tôi là trợ lý AI của EV Charging. Tôi có thể hỗ trợ bạn điều gì hôm nay?' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim()) return;
        const userMsg = input.trim();

        setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
        setInput('');
        setLoading(true);

        try {
            const res = await axiosClient.post('/api/chatbot', { message: userMsg });
            if (res.reply) {
                setMessages(prev => [...prev, { sender: 'ai', text: res.reply }]);
            } else {
                setMessages(prev => [...prev, { sender: 'ai', text: 'Xin lỗi, tôi không thể trả lời lúc này.' }]);
            }
        } catch (error) {
            console.error(error);
            const errorText = error.response?.data?.error || 'Xin lỗi, máy chủ AI đang gặp sự cố.';
            setMessages(prev => [...prev, { sender: 'ai', text: errorText }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                        style={{ marginBottom: 16 }}
                    >
                        <Card
                            bodyStyle={{
                                padding: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                flex: 1,
                                height: '100%'
                            }}
                            style={{
                                width: 350,
                                height: 500,
                                borderRadius: 16,
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                boxShadow: '0 12px 48px rgba(0,0,0,0.15)'
                            }}
                        >
                            {/* Header */}
                            <div style={{
                                padding: '16px 20px',
                                background: 'linear-gradient(135deg, #1890ff 0%, #001529 100%)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                color: 'white'
                            }}>
                                <Space>
                                    <RobotFilled style={{ fontSize: 24 }} />
                                    <Text style={{ color: 'white', fontWeight: 600, fontSize: 16 }}>Trợ lý EV Charging</Text>
                                </Space>
                                <Button
                                    type="text"
                                    icon={<CloseOutlined style={{ color: 'white' }} />}
                                    onClick={() => setIsOpen(false)}
                                />
                            </div>

                            {/* Chat History */}
                            <div style={{
                                flex: 1,
                                padding: 16,
                                overflowY: 'auto',
                                background: '#f5f5f5',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 12
                            }}>
                                {messages.map((msg, idx) => (
                                    <div key={idx} style={{
                                        display: 'flex',
                                        flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row',
                                        gap: 8,
                                        alignItems: 'flex-start'
                                    }}>
                                        {msg.sender === 'ai' && (
                                            <Avatar
                                                icon={<RobotFilled />}
                                                style={{ backgroundColor: '#125ea6ff' }}
                                            />
                                        )}
                                        <div style={{
                                            maxWidth: '75%',
                                            padding: '10px 14px',
                                            borderRadius: 16,
                                            borderTopLeftRadius: msg.sender === 'ai' ? 4 : 16,
                                            borderTopRightRadius: msg.sender === 'user' ? 4 : 16,
                                            backgroundColor: msg.sender === 'user' ? '#1890ff' : 'white',
                                            color: msg.sender === 'user' ? 'white' : 'black',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word'
                                        }}>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                                {loading && (
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                        <Avatar icon={<RobotFilled />} style={{ backgroundColor: '#125ea6ff' }} />
                                        <div style={{ padding: '10px 14px', borderRadius: 16, backgroundColor: 'white' }}>
                                            <Spin size="small" />
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div style={{ padding: 16, background: 'white', borderTop: '1px solid #f0f0f0' }}>
                                <Input
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onPressEnter={handleSend}
                                    placeholder="Nhập câu hỏi của bạn..."
                                    suffix={
                                        <Button
                                            type="primary"
                                            shape="circle"
                                            icon={<SendOutlined />}
                                            onClick={handleSend}
                                            disabled={!input.trim() || loading}
                                        />
                                    }
                                    style={{ borderRadius: 24, paddingRight: 4 }}
                                />
                            </div>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {!isOpen && (
                <Button
                    type="primary"
                    shape="circle"
                    size="large"
                    icon={<MessageOutlined style={{ fontSize: 24 }} />}
                    onClick={() => setIsOpen(true)}
                    style={{
                        width: 60,
                        height: 60,
                        boxShadow: '0 8px 24px rgba(24,144,255,0.4)'
                    }}
                />
            )}
        </div>
    );
};

export default ChatbotWidget;
