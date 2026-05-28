import React from 'react';
import { Result, Button, Typography } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const { Text } = Typography;

const PaymentResult = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Lấy query param từ URL (ví dụ: ?code=00&id=123&cancel=false)
    const queryParams = new URLSearchParams(location.search);
    const code = queryParams.get('code');
    const isCancel = queryParams.get('cancel') === 'true';

    // PayOS trả về code='00' nếu thành công
    const isSuccess = code === '00' && !isCancel;

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
                        title="Thanh Toán Thành Công!"
                        subTitle={<Text>Cảm ơn bạn. Lịch sạc của bạn đã được thanh toán và xác nhận.</Text>}
                        extra={[
                            <Button
                                type="primary"
                                key="console"
                                size="large"
                                onClick={() => navigate('/user/bookings')}
                                style={{ borderRadius: '8px' }}
                            >
                                Xem lịch sạc của tôi
                            </Button>,
                            <Button
                                key="buy"
                                size="large"
                                onClick={() => navigate('/user')}
                                style={{ borderRadius: '8px' }}
                            >
                                Về trang chủ
                            </Button>,
                        ]}
                    />
                ) : (
                    <Result
                        status="error"
                        title="Thanh toán thất bại"
                        subTitle={<Text>Có lỗi xảy ra trong quá trình thanh toán.</Text>}
                        extra={[
                            <Button
                                type="primary"
                                key="console"
                                size="large"
                                onClick={() => navigate('/user')}
                                style={{ borderRadius: '8px' }}
                            >
                                Quay lại trang chủ
                            </Button>
                        ]}
                    />
                )}
            </motion.div>
        </div>
    );
};

export default PaymentResult;
