import React, { useEffect, useState } from 'react';
import { Result, Button, Typography, QRCode } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { DownloadOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import bookingService from '../../api/bookingService';
import dayjs from 'dayjs';

const { Text } = Typography;

const PaymentResult = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [bookingDetails, setBookingDetails] = useState(null);

    // Lấy query param từ URL (ví dụ: ?code=00&id=123&cancel=false)
    const queryParams = new URLSearchParams(location.search);
    const code = queryParams.get('code');
    const isCancel = queryParams.get('cancel') === 'true';
    const orderCode = queryParams.get('orderCode');

    // PayOS trả về code='00' nếu thành công
    const isSuccess = code === '00' && !isCancel;

    useEffect(() => {
        if (isCancel && orderCode) {
            // Tự động hủy đơn nếu người dùng bấm Hủy trên PayOS
            bookingService.cancel(orderCode).catch(err => console.error('Auto-cancel failed', err));
            navigate('/map', { replace: true });
        } else if (isCancel && !orderCode) {
            navigate('/map', { replace: true });
        } else if (isSuccess && orderCode) {
            // Xác thực thủ công khi webhook localhost không hoạt động
            bookingService.verifyPayment(orderCode).then(res => {
                if (res && res.bookingData) {
                    setBookingDetails(res.bookingData);
                }
            }).catch(e => console.error('Verify failed', e));
        }
    }, [isCancel, isSuccess, orderCode, navigate]);

    if (isCancel) {
        return null;
    }

    // Tạo nội dung QR Code chuẩn cho hệ thống phần cứng (JSON)
    let qrData = { bookingId: orderCode };
    if (bookingDetails) {
        qrData = {
            bookingId: orderCode,
            portId: bookingDetails.charger_id || bookingDetails.port_id,
            details: `Tên: ${bookingDetails.full_name}\nTrạm: ${bookingDetails.station_name}\nCổng: ${bookingDetails.port_name}\nNgày: ${dayjs(bookingDetails.booking_date).format('DD/MM/YYYY')}\nGiờ: ${bookingDetails.start_time} - ${bookingDetails.end_time}\nTiền: ${Number(bookingDetails.cost).toLocaleString()}đ`
        };
    }
    const qrContent = JSON.stringify(qrData);

    const downloadQRCode = () => {
        const canvas = document.getElementById('booking-qr')?.querySelector('canvas');
        if (canvas) {
            const url = canvas.toDataURL();
            const a = document.createElement('a');
            a.download = `Booking_QR_${orderCode}.png`;
            a.href = url;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    };

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f0f2f5'
        }}>
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{
                    background: '#fff',
                    padding: '40px',
                    borderRadius: '16px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                    textAlign: 'center',
                    maxWidth: '500px',
                    width: '90%'
                }}
            >
                {isSuccess ? (
                    <Result
                        status="success"
                        title="Cảm ơn bạn đã sử dụng dịch vụ"
                        subTitle={<Text>Vui lòng lưu lại mã QR để sử dụng khi đến trạm sạc</Text>}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginTop: 10 }}>
                            <div id="booking-qr" style={{ padding: 16, background: '#fff', borderRadius: 8, border: '1px solid #f0f0f0' }}>
                                <QRCode value={qrContent} size={180} />
                            </div>
                            <Button 
                                type="dashed" 
                                icon={<DownloadOutlined />} 
                                onClick={downloadQRCode}
                            >
                                Tải mã QR về máy
                            </Button>
                            <Button
                                type="primary"
                                size="large"
                                onClick={() => navigate('/user')}
                                style={{ borderRadius: '8px', width: '200px', marginTop: 8 }}
                            >
                                Về trang chủ
                            </Button>
                        </div>
                    </Result>
                ) : (
                    <Result
                        status="error"
                        title="Thanh toán thất bại"
                        subTitle={<Text>Có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại sau!</Text>}
                        extra={[
                            <Button
                                type="primary"
                                key="console"
                                size="large"
                                onClick={() => navigate('/user')}
                                style={{ borderRadius: '8px' }}
                            >
                                Về trang chủ
                            </Button>
                        ]}
                    />
                )}
            </motion.div>
        </div>
    );
};

export default PaymentResult;
