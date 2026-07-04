import React, { useState, useEffect, useRef } from 'react';
import { Card, Typography, Button, message, Space, Statistic, Row, Col, Progress, Upload, QRCode } from 'antd';
import { ScanOutlined, ThunderboltOutlined, CheckCircleOutlined, UploadOutlined } from '@ant-design/icons';
import { Html5Qrcode } from 'html5-qrcode';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';
import socket from '../../api/socket';
import bookingService from '../../api/bookingService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const { Title, Text } = Typography;

const HardwareSimulator = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [scanState, setScanState] = useState('IDLE');
    const [bookingData, setBookingData] = useState(null);
    const [billingData, setBillingData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const code = queryParams.get('code');
        const isCancel = queryParams.get('cancel') === 'true';
        const orderCode = queryParams.get('orderCode');

        if (code === '00' && !isCancel && orderCode) {
            bookingService.verifyPayment(orderCode).then(res => {
                message.success('Thanh toán hóa đơn thành công!');
                navigate('/simulator', { replace: true });
                setScanState('IDLE');
                setBookingData(null);
                setBillingData(null);
            }).catch(e => {
                console.error('Verify failed', e);
                message.error('Lỗi khi xác nhận thanh toán');
            });
        }
    }, [location.search, navigate]);

    // Timer state for CHARGING
    const [remainingSeconds, setRemainingSeconds] = useState(0);
    const [progress, setProgress] = useState(0);
    const timerRef = useRef(null);

    const handleFileUpload = async (file) => {
        try {
            setLoading(true);
            const html5QrCode = new Html5Qrcode("reader");
            const decodedText = await html5QrCode.scanFile(file, true);

            message.success('Đã đọc được mã QR!');
            handleScanSuccess(decodedText);
        } catch (err) {
            console.error('Lỗi đọc mã QR:', err);
            message.error('Không tìm thấy mã QR trong ảnh hoặc ảnh bị mờ.');
        } finally {
            setLoading(false);
        }
        return false;
    };

    const handleScanSuccess = async (decodedText) => {
        try {
            const data = JSON.parse(decodedText);
            if (!data.bookingId) {
                throw new Error('Dữ liệu QR không chứa mã đặt lịch');
            }

            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/api/simulator/scan`, data, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setBookingData(res.data.booking);
            setScanState('SCANNED');
            message.success('Xác thực mã QR thành công!');
        } catch (error) {
            console.error(error);
            const errorMsg = error.response?.data?.error || error.message || 'Lỗi hệ thống';
            message.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const startCharging = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/simulator/start`, {
                bookingId: bookingData.id
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setScanState('CHARGING');
            message.success('Bắt đầu sạc!');

            let startTimeStr = bookingData.start_time;
            let startDateTime = dayjs(`${dayjs(bookingData.booking_date).format('YYYY-MM-DD')} ${startTimeStr}`, 'YYYY-MM-DD HH:mm:ss');
            let endTimeStr = bookingData.end_time;
            let endDateTime = dayjs(`${dayjs(bookingData.booking_date).format('YYYY-MM-DD')} ${endTimeStr}`, 'YYYY-MM-DD HH:mm:ss');
            if (endTimeStr === '24:00:00' || endTimeStr === '00:00:00') {
                endDateTime = dayjs(bookingData.booking_date).add(1, 'day').startOf('day');
            }

            const now = dayjs();
            const bookingDuration = endDateTime.diff(startDateTime, 'second');
            const timeUntilEnd = endDateTime.diff(now, 'second');

            let totalSeconds = Math.min(bookingDuration > 0 ? bookingDuration : 3600, timeUntilEnd);

            if (totalSeconds <= 0) {
                message.error('Đã quá thời gian sạc!');
                setLoading(false);
                return;
            }

            setRemainingSeconds(totalSeconds);

            const timerStartTime = dayjs();
            timerRef.current = setInterval(() => {
                const current = dayjs();
                const elapsed = current.diff(timerStartTime, 'second');
                const secondsLeft = totalSeconds - elapsed;
                const percentage = Math.min(100, (elapsed / totalSeconds) * 100);

                setProgress(percentage);
                setRemainingSeconds(secondsLeft > 0 ? secondsLeft : 0);

                if (secondsLeft <= 0) {
                    clearInterval(timerRef.current);
                    stopCharging();
                }
            }, 1000);

        } catch (error) {
            message.error(error.response?.data?.error || 'Không thể bắt đầu sạc');
        } finally {
            setLoading(false);
        }
    };

    const stopCharging = async () => {
        if (timerRef.current) clearInterval(timerRef.current);

        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/api/simulator/stop`, {
                bookingId: bookingData.id
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setBillingData(res.data.billing);
            setScanState('COMPLETED');
            message.success('Sạc hoàn tất!');
        } catch (error) {
            message.error(error.response?.data?.error || 'Lỗi khi ngắt sạc');
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const resetSimulator = () => {
        setScanState('IDLE');
        setBookingData(null);
        setBillingData(null);
        setProgress(0);
        setRemainingSeconds(0);
    };

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    useEffect(() => {
        const handlePaymentSuccess = (data) => {
            if (bookingData && data.bookingId === bookingData.id) {
                if (scanState === 'COMPLETED' && billingData && billingData.difference > 0) {
                    message.success('Khách hàng đã thanh toán thành công!');
                    setBillingData(prev => ({ ...prev, isPaid: true }));
                    setTimeout(() => {
                        resetSimulator();
                    }, 2500);
                }
            }
        };

        socket.on('paymentSuccess', handlePaymentSuccess);
        return () => {
            socket.off('paymentSuccess', handlePaymentSuccess);
        };
    }, [bookingData, scanState, billingData]);

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#2c3e50', padding: 20 }}>
            <Card style={{ width: 450, borderRadius: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.3)', overflow: 'hidden' }} bodyStyle={{ padding: 0 }}>
                <div style={{ background: '#1890ff', padding: '20px 24px', color: '#fff', textAlign: 'center' }}>
                    <Title level={3} style={{ color: '#fff', margin: 0 }}>
                        <ThunderboltOutlined /> EV Charging
                    </Title>
                    {bookingData ? (
                        <Text style={{ color: 'rgba(255,255,255,0.8)' }}>
                            Tên trạm: {bookingData.station_name} | Cổng: {bookingData.port_number}
                        </Text>
                    ) : (
                        <Text style={{ color: 'rgba(255,255,255,0.8)' }}>Trạng thái: Đang chờ khách</Text>
                    )}
                </div>

                <div style={{ padding: 24, textAlign: 'center', minHeight: 350, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    {scanState === 'IDLE' && (
                        <div>
                            <div id="reader" style={{ display: 'none' }}></div>
                            <ScanOutlined style={{ fontSize: 64, color: '#1890ff', marginBottom: 20 }} />
                            <Title level={4}>Quét mã QR để bắt đầu</Title>
                            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                                Tải mã QR từ lịch sử đặt chỗ để xác thực.
                            </Text>

                            <Upload
                                beforeUpload={handleFileUpload}
                                showUploadList={false}
                                accept="image/*"
                            >
                                <Button type="primary" size="large" icon={<UploadOutlined />} loading={loading} style={{ borderRadius: 8 }}>
                                    Tải lên
                                </Button>
                            </Upload>
                        </div>
                    )}

                    {scanState === 'SCANNED' && (
                        <div>
                            <CheckCircleOutlined style={{ fontSize: 50, color: '#52c41a', marginBottom: 16 }} />
                            <Title level={4} style={{ color: '#52c41a' }}>Xác thực thành công</Title>

                            <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 12, textAlign: 'left', marginBottom: 24 }}>
                                <p><strong>Khách hàng:</strong> {bookingData.full_name}</p>
                                <p><strong>Khung giờ:</strong> {bookingData.start_time} - {bookingData.end_time}</p>
                                <p><strong>Đơn giá sạc:</strong> <Text strong style={{ color: '#1890ff' }}>{Number(bookingData.price_per_kwh).toLocaleString()} đ/kWh</Text></p>
                                <p><strong>Công suất trụ:</strong> {bookingData.power_output} kW</p>
                            </div>

                            <Button
                                type="primary"
                                size="large"
                                block
                                style={{ height: 50, borderRadius: 12, fontSize: 18 }}
                                onClick={startCharging}
                                loading={loading}
                            >
                                Bắt đầu sạc
                            </Button>
                        </div>
                    )}

                    {scanState === 'CHARGING' && (
                        <div>
                            <Progress
                                type="dashboard"
                                percent={Math.round(progress)}
                                format={() => <ThunderboltOutlined style={{ color: '#1890ff' }} />}
                                strokeColor={{
                                    '0%': '#108ee9',
                                    '100%': '#87d068',
                                }}
                                width={150}
                            />

                            <div style={{ margin: '20px 0' }}>
                                <Text type="secondary">Thời gian còn lại</Text>
                                <Title level={2} style={{ margin: 0, fontFamily: 'monospace', color: '#1890ff' }}>
                                    {formatTime(remainingSeconds)}
                                </Title>
                            </div>

                            <Button type="primary" danger size="large" block style={{ height: 50, borderRadius: 8, marginTop: 16 }} onClick={stopCharging} loading={loading}>
                                Kết thúc sạc
                            </Button>
                        </div>
                    )}

                    {scanState === 'COMPLETED' && billingData && (
                        <div>
                            <Title level={3}>Thanh toán hóa đơn</Title>

                            <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', padding: 16, borderRadius: 12, textAlign: 'left', marginBottom: 24 }}>
                                <Title level={5} style={{ marginTop: 0 }}>Hoá đơn tiêu thụ</Title>
                                <Row justify="space-between" style={{ marginBottom: 8 }}>
                                    <Text>Thời gian sạc:</Text>
                                    <Text>
                                        {billingData.startTime ? dayjs(billingData.startTime).format('HH:mm:ss') : ''} - {billingData.endTime ? dayjs(billingData.endTime).format('HH:mm:ss') : ''} ({billingData.timeElapsed} phút)
                                    </Text>
                                </Row>
                                <Row justify="space-between" style={{ marginBottom: 8 }}>
                                    <Text>Đơn giá sạc:</Text>
                                    <Text>{Number(bookingData.price_per_kwh).toLocaleString()} đ/kWh</Text>
                                </Row>
                                <Row justify="space-between" style={{ marginBottom: 8 }}>
                                    <Text>Sản lượng điện tiêu thụ:</Text>
                                    <Text>{billingData.kwh} kWh</Text>
                                </Row>
                                <Row justify="space-between" style={{ marginBottom: 8 }}>
                                    <Text>Tiền cọc lúc đặt lịch:</Text>
                                    <Text>{billingData.depositPaid.toLocaleString()} đ</Text>
                                </Row>
                                <Row justify="space-between" style={{ marginBottom: 8 }}>
                                    <Text>Phí dịch vụ giữ chỗ:</Text>
                                    <Text>{billingData.fixedBookingFee.toLocaleString()} đ</Text>
                                </Row>
                                <Row justify="space-between" style={{ borderBottom: '1px solid #b7eb8f', paddingBottom: 8, marginBottom: 8 }}>
                                    <Text>Phí sạc xe:</Text>
                                    <Text>{billingData.electricityCost.toLocaleString()} đ</Text>
                                </Row>
                                <Row justify="space-between" style={{ paddingTop: 8 }}>
                                    <Text strong style={{ fontSize: 16 }}>
                                        {billingData.difference > 0 ? 'Khách cần thanh toán thêm:' : 'Khách được hoàn tiền:'}
                                    </Text>
                                    <Text strong style={{ color: billingData.difference > 0 ? '#f5222d' : '#52c41a', fontSize: 18 }}>
                                        {Math.abs(billingData.difference).toLocaleString()} đ
                                    </Text>
                                </Row>
                            </div>

                            {billingData.difference > 0 && billingData.checkoutUrl && (
                                <div style={{ marginBottom: 24 }}>
                                    <Button
                                        type="primary"
                                        size="large"
                                        block
                                        style={{ height: 50, borderRadius: 12, fontSize: 18, backgroundColor: '#f5222d', borderColor: '#f5222d' }}
                                        onClick={() => window.location.href = billingData.checkoutUrl}
                                    >
                                        Thanh toán hóa đơn
                                    </Button>
                                </div>
                            )}

                            {(!billingData.difference || billingData.difference <= 0) && (
                                <Button block type="default" size="large" onClick={resetSimulator}>
                                    Xác nhận
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default HardwareSimulator;
