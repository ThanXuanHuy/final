import React, { useState, useRef, useEffect } from 'react';
import { Button, Card, Input, Typography, Spin, Space, Avatar, Tooltip } from 'antd';
import { MessageOutlined, CloseOutlined, SendOutlined, RobotFilled, EnvironmentOutlined, CompassOutlined } from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

const { Text } = Typography;

const ChatbotWidget = () => {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { sender: 'ai', text: 'Xin chào! Tôi là trợ lý AI của EV Charging. Tôi có thể hỗ trợ bạn:\n- Tìm trạm sạc gần nhất\n- Xem giá sạc & chỗ trống\n- Chỉ đường đến trạm sạc\n- Tư vấn xe điện & khuyến mãi\n\nBạn cần hỗ trợ gì?' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [userLocation, setUserLocation] = useState(null);
    const [locationLoading, setLocationLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            setMessages(prev => [...prev, { sender: 'ai', text: 'Trình duyệt của bạn không hỗ trợ định vị. Vui lòng nhập địa chỉ để em tìm trạm sạc gần đó nhé!' }]);
            return;
        }

        setLocationLoading(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
                setUserLocation(loc);
                setLocationLoading(false);
                setMessages(prev => [...prev, { sender: 'ai', text: `Đã nhận vị trí của bạn! Bây giờ bạn có thể hỏi nhé.` }]);
            },
            (error) => {
                setLocationLoading(false);
                setMessages(prev => [...prev, { sender: 'ai', text: 'Không thể lấy vị trí. Vui lòng bật định vị trong trình duyệt và thử lại, hoặc cho tôi biết bạn đang ở đâu nhé!' }]);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleSend = async () => {
        if (!input.trim()) return;
        const userMsg = input.trim();

        setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
        setInput('');
        setLoading(true);

        const history = messages.map(msg => ({
            role: msg.sender === 'ai' ? 'model' : 'user',
            parts: [{ text: msg.text }]
        }));

        try {
            const res = await axiosClient.post('/api/chatbot', {
                message: userMsg,
                history,
                userLocation
            });
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

    // Render link Google Maps nếu có trong text
    const renderMessageText = (text) => {
        const navRegex = /\[XEM_BAN_DO:(\d+)\]/g;
        const parts = text.split(navRegex);
        return parts.map((part, i) => {
            // Odd indices are the captured station IDs
            if (i % 2 === 1) {
                const stationId = Number(part);
                return (
                    <Button
                        key={i}
                        type="primary"
                        size="small"
                        icon={<CompassOutlined />}
                        onClick={() => {
                            setIsOpen(false);
                            navigate('/map', { state: { openStationId: stationId } });
                        }}
                        style={{
                            borderRadius: 16,
                            margin: '4px 0',
                            background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
                            border: 'none',
                            fontWeight: 500
                        }}
                    >
                        📍 Xem trên bản đồ
                    </Button>
                );
            }
            return <span key={i}>{part}</span>;
        });
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
                                width: 380,
                                height: 550,
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
                                    <div>
                                        <Text style={{ color: 'white', fontWeight: 600, fontSize: 16, display: 'block' }}>Trợ lý EV Charging</Text>
                                        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>
                                            {userLocation ? '📍 Đã có vị trí' : '💬 Đang hoạt động'}
                                        </Text>
                                    </div>
                                </Space>
                                <Button
                                    type="text"
                                    icon={<CloseOutlined style={{ color: 'white' }} />}
                                    onClick={() => setIsOpen(false)}
                                />
                            </div>

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
                                            wordBreak: 'break-word',
                                            lineHeight: 1.5
                                        }}>
                                            {renderMessageText(msg.text)}
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

                            <div style={{ padding: '12px 16px', background: 'white', borderTop: '1px solid #f0f0f0' }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <Tooltip title={userLocation ? 'Đã có vị trí' : 'Gửi vị trí của bạn'}>
                                        <Button
                                            type={userLocation ? 'primary' : 'default'}
                                            shape="circle"
                                            icon={<EnvironmentOutlined />}
                                            onClick={handleGetLocation}
                                            loading={locationLoading}
                                            size="small"
                                            style={userLocation ? { backgroundColor: '#52c41a', borderColor: '#52c41a' } : {}}
                                        />
                                    </Tooltip>
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
                                        style={{ borderRadius: 24, paddingRight: 4, flex: 1 }}
                                    />
                                </div>
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
