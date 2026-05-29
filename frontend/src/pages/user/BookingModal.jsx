import React from 'react';
import {
    Modal, Button, Typography, Select, DatePicker, Divider, Row
} from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const BookingModal = ({
    visible,
    onCancel,
    bookingStep,
    selectedStation,
    chargers,
    selectedChargerPort,
    onChargerPortChange,
    selectedDate,
    onDateChange,
    selectedTimeSlots,
    onToggleTimeSlot,
    mockBookedSlots,
    estimatedCost,
    isProcessingPayment,
    onPayment,
}) => {
    return (
        <Modal
            title="ĐẶT LỊCH SẠC"
            open={visible}
            onCancel={onCancel}
            footer={null}
            width={500}
            centered
            style={{ borderRadius: 24 }}
        >
            {bookingStep === 1 ? (
                <div>
                    <div style={{ textAlign: 'center', marginBottom: 24 }}>
                        <Title level={4} style={{ margin: 0 }}>{selectedStation?.name}</Title>
                        <Text type="secondary">{selectedStation?.address}</Text>
                    </div>

                    {/* Step 1: Chọn ngày */}
                    <div style={{ marginBottom: 16 }}>
                        <Text strong>1. Chọn ngày sạc:</Text>
                        <DatePicker
                            style={{ width: '100%', marginTop: 8 }}
                            size="large"
                            format="DD-MM-YYYY"
                            disabledDate={current => current && current < dayjs().startOf('day')}
                            value={selectedDate}
                            onChange={(date) => onDateChange(date || dayjs())}
                        />
                    </div>

                    {/* Step 2: Chọn cổng sạc */}
                    <div style={{ marginBottom: 16 }}>
                        <Text strong>2. Chọn cổng sạc:</Text>
                        <Select
                            size="large"
                            style={{ width: '100%', marginTop: 8 }}
                            placeholder="-- Vui lòng chọn cổng sạc --"
                            value={selectedChargerPort}
                            onChange={onChargerPortChange}
                        >
                            {chargers.map((charger, index) => (
                                <Select.Option
                                    key={charger.id}
                                    value={charger.id}
                                    disabled={charger.status === 'MAINTENANCE' || charger.status === 'OFFLINE'}
                                >
                                    Cổng {index + 1} {charger.status === 'MAINTENANCE' || charger.status === 'OFFLINE' ? '(Bảo trì/Ngoại tuyến)' : ''}
                                </Select.Option>
                            ))}
                        </Select>
                    </div>

                    {/* Step 3: Chọn giờ sạc */}
                    {selectedChargerPort && (
                        <div style={{ marginBottom: 24 }}>
                            <Text strong>3. Chọn giờ sạc (24h):</Text>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(6, 1fr)',
                                gap: 8,
                                marginTop: 12
                            }}>
                                {Array.from({ length: 24 }, (_, i) => i).map(hour => {
                                    const isToday = selectedDate.isSame(dayjs(), 'day');
                                    const isPast = isToday && hour <= dayjs().hour();
                                    const isBooked = mockBookedSlots.includes(hour);
                                    const isSelected = selectedTimeSlots.includes(hour);

                                    let bgColor = '#ffffff';
                                    let textColor = '#333';
                                    let borderColor = '#d9d9d9';
                                    let cursor = 'pointer';

                                    if (isPast) {
                                        bgColor = '#f0f0f0'; textColor = '#bfbfbf';
                                        borderColor = '#e8e8e8'; cursor = 'not-allowed';
                                    } else if (isBooked) {
                                        bgColor = '#ff4d4f'; textColor = '#fff';
                                        borderColor = '#ff4d4f'; cursor = 'not-allowed';
                                    } else if (isSelected) {
                                        bgColor = '#52c41a'; textColor = '#fff';
                                        borderColor = '#52c41a';
                                    } else {
                                        bgColor = '#f5f5f5';
                                    }

                                    return (
                                        <div
                                            key={hour}
                                            onClick={() => onToggleTimeSlot(hour)}
                                            style={{
                                                background: bgColor,
                                                color: textColor,
                                                border: `1px solid ${borderColor}`,
                                                borderRadius: 8,
                                                padding: '10px 0',
                                                textAlign: 'center',
                                                cursor: cursor,
                                                fontWeight: isSelected ? 'bold' : 'normal',
                                                transition: 'all 0.2s',
                                                userSelect: 'none'
                                            }}
                                        >
                                            {hour.toString().padStart(2, '0')}:00
                                        </div>
                                    );
                                })}
                            </div>
                            {/* Legend */}
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 12, fontSize: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <div style={{ width: 12, height: 12, background: '#f5f5f5', border: '1px solid #d9d9d9', borderRadius: 2 }}></div> Trống
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <div style={{ width: 12, height: 12, background: '#52c41a', borderRadius: 2 }}></div> Đang chọn
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <div style={{ width: 12, height: 12, background: '#ff4d4f', borderRadius: 2 }}></div> Đã đặt
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Chi tiết thanh toán */}
                    <div style={{ padding: 16, background: '#f5f5f5', borderRadius: 16, marginBottom: 24 }}>
                        <Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>Chi tiết thanh toán</Title>
                        <Row justify="space-between">
                            <Text>Cổng sạc đang chọn:</Text>
                            <Text strong>
                                {selectedChargerPort
                                    ? `Cổng số ${chargers.findIndex(c => c.id === selectedChargerPort) + 1}`
                                    : '--'}
                            </Text>
                        </Row>
                        <Row justify="space-between" style={{ marginTop: 8 }}>
                            <Text>Thời gian đặt:</Text>
                            <Text strong>
                                {selectedTimeSlots.length > 0
                                    ? `${Math.min(...selectedTimeSlots).toString().padStart(2, '0')}:00 đến ${(Math.max(...selectedTimeSlots) + 1 === 24 ? 0 : Math.max(...selectedTimeSlots) + 1).toString().padStart(2, '0')}:00`
                                    : '--:-- đến --:--'}
                            </Text>
                        </Row>
                        <Divider style={{ margin: '12px 0' }} />
                        <Row justify="space-between">
                            <Text>Phí đặt chỗ:</Text>
                            <Text strong>20,000 đ</Text>
                        </Row>
                        <Row justify="space-between" style={{ marginTop: 8 }}>
                            <Text>Đơn giá sạc:</Text>
                            <Text strong>
                                {estimatedCost.pricePerKwh
                                    ? `${Number(estimatedCost.pricePerKwh).toLocaleString()} đ/kWh`
                                    : 'Chưa xác định'}
                            </Text>
                        </Row>
                        <Row justify="space-between" style={{ marginTop: 8 }}>
                            <Text>Sản lượng tiêu thụ dự kiến ({selectedTimeSlots.length} giờ):</Text>
                            <Text strong>{estimatedCost.kwh} kWh</Text>
                        </Row>
                        <Divider style={{ margin: '12px 0' }} />
                        <Row justify="space-between">
                            <Text strong style={{ fontSize: 16 }}>Tổng chi phí ước tính:</Text>
                            <Text strong style={{ fontSize: 18, color: '#f5222d' }}>
                                {estimatedCost.cost.toLocaleString()} đ
                            </Text>
                        </Row>
                    </div>

                    <Button
                        type="primary"
                        block
                        size="large"
                        loading={isProcessingPayment}
                        disabled={selectedTimeSlots.length < 1}
                        onClick={onPayment}
                        style={{ height: 54, borderRadius: 16, fontWeight: 700 }}
                    >
                        Thanh toán ngay
                    </Button>
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                        <CheckCircleOutlined style={{ fontSize: 80, color: '#52c41a', marginBottom: 24 }} />
                    </motion.div>
                    <Title level={3}>Đặt lịch thành công!</Title>
                    <Text type="secondary">Cảm ơn bạn đã sử dụng dịch vụ. Thông tin chi tiết đã được gửi vào email của bạn.</Text>
                    <div style={{ marginTop: 32 }}>
                        <Button type="primary" size="large" block onClick={onCancel} style={{ borderRadius: 12 }}>
                            Xác nhận
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default BookingModal;
