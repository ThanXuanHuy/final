import React, { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Typography, Button, Form, Input, Select, Space, Divider, Tag, Statistic, Alert, Modal, List } from 'antd';
import {
    DollarOutlined,
    CheckCircleOutlined,
    ArrowRightOutlined,
    SafetyCertificateOutlined,
    GlobalOutlined,
    ThunderboltFilled,
    CheckCircleFilled,
    SafetyCertificateFilled
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { message } from 'antd';
import incentiveService from '../../api/incentiveService';
import evModelService from '../../api/evModelService';
import { useAuthStore } from '../../store/authStore';

const { Title, Text, Paragraph } = Typography;

const SupportPage = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [incentives, setIncentives] = useState([]);
    const [evModels, setEvModels] = useState([]);
    const [mileage, setMileage] = useState(50);
    const [fuelPrice, setFuelPrice] = useState(24000);
    const [evPrice, setEvPrice] = useState(3000);
    const [selectedCar, setSelectedCar] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { user } = useAuthStore();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [incentivesData, evModelsData] = await Promise.all([
                    incentiveService.getAll(),
                    evModelService.getAll()
                ]);
                setIncentives(incentivesData || []);
                setEvModels(evModelsData || []);
            } catch (error) {
                console.error('Failed to fetch data');
            }
        };
        fetchData();
    }, []);

    const costData = useMemo(() => {
        const data = [];
        const monthlyKm = mileage * 30;
        const gasConsumption = 8 / 100;
        const evConsumption = 15 / 100;

        const monthlyGasCost = monthlyKm * gasConsumption * fuelPrice;
        const monthlyEvCost = monthlyKm * evConsumption * evPrice;

        for (let i = 0; i <= 60; i += 12) {
            data.push({
                month: i.toString(),
                gas: Math.round(monthlyGasCost * i),
                ev: Math.round(monthlyEvCost * i),
            });
        }
        return data;
    }, [mileage, fuelPrice, evPrice]);

    const savingsPerMonth = useMemo(() => {
        const monthlyKm = mileage * 30;
        const gasCost = monthlyKm * (8 / 100) * fuelPrice;
        const evCost = monthlyKm * (15 / 100) * evPrice;
        return gasCost - evCost;
    }, [mileage, fuelPrice, evPrice]);

    const handleSubmit = async (values) => {
        if (!user) {
            message.error('Vui lòng đăng nhập để đăng ký hỗ trợ');
            return;
        }
        setLoading(true);
        try {
            await incentiveService.register({
                incentive_id: values.incentive_id,
                vehicle_info: JSON.stringify({
                    old_vehicle: values.oldVehicle,
                    plate: values.plate,
                    new_vehicle_expected: values.newVehicle
                })
            });
            message.success('Đã gửi hồ sơ đăng ký thành công! Chúng tôi sẽ xét duyệt trong thời gian sớm nhất.');
            form.resetFields();
        } catch (error) {
            message.error('Lỗi khi gửi hồ sơ đăng ký');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 1500, margin: '0 auto', paddingBottom: 100 }}>
            {/* Hero Section */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                style={{
                    marginBottom: 48,
                    background: 'linear-gradient(135deg, #f0f5ff 0%, #ffffff 100%)',
                    padding: '40px 32px',
                    borderRadius: 32,
                    boxShadow: '0 20px 40px rgba(24, 144, 255, 0.05)',
                    border: '1px solid rgba(24, 144, 255, 0.1)',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                {/* Decorative background shapes */}
                <div style={{ position: 'absolute', top: -100, left: -100, width: 300, height: 300, background: 'rgba(24, 144, 255, 0.1)', filter: 'blur(80px)', borderRadius: '50%' }}></div>
                <div style={{ position: 'absolute', bottom: -100, right: -100, width: 300, height: 300, background: 'rgba(82, 196, 26, 0.08)', filter: 'blur(80px)', borderRadius: '50%' }}></div>

                <Row gutter={[32, 32]} align="middle" style={{ position: 'relative', zIndex: 1 }}>
                    <Col xs={24} lg={12} style={{ textAlign: 'left' }}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            <Tag style={{
                                borderRadius: 20,
                                padding: '6px 16px',
                                fontSize: 14,
                                fontWeight: 600,
                                marginBottom: 24,
                                border: 'none',
                                background: 'linear-gradient(90deg, #e6fffb 0%, #e6f7ff 100%)',
                                color: '#08979c',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.03)'
                            }}>
                                ✨ Xanh hóa giao thông
                            </Tag>
                        </motion.div>

                        <Title level={1} style={{
                            fontSize: 48,
                            fontWeight: 800,
                            marginBottom: 24,
                            background: 'linear-gradient(90deg, #1890ff, #52c41a)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            display: 'inline-block'
                        }}>
                            Hỗ trợ chuyển đổi xe điện
                        </Title>

                        <Paragraph style={{
                            fontSize: 18,
                            color: '#595959',
                            lineHeight: 1.8,
                            marginBottom: 32
                        }}>
                            Khám phá các ưu đãi tài chính và dịch vụ khi đổi xe máy xăng sang xe điện.
                            So sánh chi phí vận hành, tìm hiểu các mẫu xe điện phù hợp và nhận những hỗ trợ hấp dẫn từ Chính phủ và các đối tác.
                            Bắt đầu chuyển đổi xanh ngay hôm nay để tiết kiệm chi phí và góp phần bảo vệ môi trường!
                        </Paragraph>
                    </Col>

                    <Col xs={24} lg={12} style={{ textAlign: 'center' }}>
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4, duration: 0.6 }}
                            style={{ position: 'relative', display: 'inline-block', padding: 10 }}
                        >
                            <div style={{
                                width: 280, height: 280, background: 'linear-gradient(135deg, #1890ff 0%, #52c41a 100%)',
                                borderRadius: '50%', position: 'absolute', top: '50%', left: '50%',
                                transform: 'translate(-50%, -50%)', opacity: 0.15, filter: 'blur(30px)'
                            }}></div>

                            <div style={{
                                width: 220, height: 220, background: 'white', borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.08)', position: 'relative', zIndex: 2,
                                border: '4px solid #f0f5ff'
                            }}>
                                <ThunderboltFilled style={{ fontSize: 110, color: '#52c41a' }} />
                            </div>

                            <Card style={{ position: 'absolute', top: 10, right: -20, zIndex: 3, borderRadius: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.1)', padding: 0 }} bodyStyle={{ padding: '10px 10px' }}>
                                <Space>
                                    <CheckCircleFilled style={{ color: '#1890ff', fontSize: 28 }} />
                                    <div style={{ textAlign: 'left' }}>
                                        <div style={{ fontWeight: 'bold', color: '#1890ff', fontSize: 16 }}>Tiết kiệm 40%</div>
                                        <div style={{ fontSize: 12, color: '#8c8c8c' }}>Chi phí vận hành</div>
                                    </div>
                                </Space>
                            </Card>

                            <Card style={{ position: 'absolute', bottom: 10, left: -20, zIndex: 3, borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.1)', padding: 0 }} bodyStyle={{ padding: '10px 10px' }}>
                                <Space>
                                    <SafetyCertificateFilled style={{ color: '#52c41a', fontSize: 28 }} />
                                    <div style={{ textAlign: 'left' }}>
                                        <div style={{ fontWeight: 'bold', color: '#52c41a', fontSize: 16 }}>100% Sạch</div>
                                        <div style={{ fontSize: 12, color: '#8c8c8c' }}>Không phát thải</div>
                                    </div>
                                </Space>
                            </Card>
                        </motion.div>
                    </Col>
                </Row>
            </motion.div>

            <Row gutter={[24, 24]}>
                {/* Benefits Section */}
                <Col span={24} id="benefits">
                    <Title level={2}><CheckCircleOutlined /> Chính sách ưu đãi hiện tại</Title>
                    <Row gutter={[16, 16]}>
                        {incentives.length > 0 ? incentives.map((item, index) => (
                            <Col xs={24} md={8} key={index}>
                                <motion.div whileHover={{ y: -5 }}>
                                    <Card hoverable style={{ minHeight: 220, border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', borderRadius: 20 }}>
                                        <div style={{ fontSize: 32, marginBottom: 10 }}>
                                            {index % 3 === 0 ? <SafetyCertificateOutlined style={{ color: '#52c41a' }} /> :
                                                index % 3 === 1 ? <DollarOutlined style={{ color: '#1890ff' }} /> :
                                                    <GlobalOutlined style={{ color: '#faad14' }} />}
                                        </div>
                                        <Title level={4}>{item.title}</Title>
                                        <Text strong style={{ color: '#f5222d', display: 'block', marginBottom: 8 }}>
                                            Hỗ trợ: {Number(item.subsidy_amount).toLocaleString()}đ
                                        </Text>
                                        <Text type="secondary">{item.description}</Text>
                                    </Card>
                                </motion.div>
                            </Col>
                        )) : (
                            <Col span={24}><Alert message="Hiện chưa có chương trình ưu đãi mới nào." type="info" /></Col>
                        )}
                    </Row>
                </Col>

                {/* Cost Comparison */}
                <Col xs={24} lg={16}>
                    <Card title="So sánh chi phí vận hành" bordered={false} style={{ height: '100%', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                        <div style={{ height: 400 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={costData}>
                                    <defs>
                                        <linearGradient id="colorGas" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ff4d4f" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#ff4d4f" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorEv" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#52c41a" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#52c41a" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="month" label={{ value: 'Tháng', position: 'insideBottomRight', offset: -5 }} />
                                    <YAxis tickFormatter={(val) => `${val / 1000000}Tr`} />
                                    <Tooltip formatter={(val) => new Intl.NumberFormat('vi-VN').format(Number(val)) + ' VNĐ'} />
                                    <Legend />
                                    <Area type="monotone" name="Xe Xăng" dataKey="gas" stroke="#ff4d4f" fillOpacity={1} fill="url(#colorGas)" />
                                    <Area type="monotone" name="Xe Điện" dataKey="ev" stroke="#52c41a" fillOpacity={1} fill="url(#colorEv)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        <Divider />
                        <Row gutter={24} style={{ marginBottom: 24 }}>
                            <Col xs={24} md={8}>
                                <Text strong>Quãng đường (km/ngày)</Text>
                                <Input type="number" value={mileage} onChange={e => setMileage(Number(e.target.value))} />
                            </Col>
                            <Col xs={24} md={8}>
                                <Text strong>Giá xăng (VNĐ/Lít)</Text>
                                <Input type="number" value={fuelPrice} onChange={e => setFuelPrice(Number(e.target.value))} />
                            </Col>
                            <Col xs={24} md={8}>
                                <Text strong>Giá điện (VNĐ/kWh)</Text>
                                <Input type="number" value={evPrice} onChange={e => setEvPrice(Number(e.target.value))} />
                            </Col>
                        </Row>
                        <Row gutter={24}>
                            <Col span={12}>
                                <Statistic title="Tiết kiệm mỗi tháng khoảng" value={savingsPerMonth} suffix="VNĐ" valueStyle={{ color: '#3f8600' }} />
                            </Col>
                            <Col span={12}>
                                <Statistic title="Giảm phát thải CO2" value={(mileage * 30 * 12 * 0.2 / 1000).toFixed(1)} suffix="Tấn/năm" valueStyle={{ color: '#1890ff' }} />
                            </Col>
                        </Row>
                    </Card>
                </Col>

                {/* Registration Form */}
                <Col xs={24} lg={8}>
                    <Card title="Đăng ký hỗ trợ chuyển đổi xe" bordered={false} style={{ height: '100%', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                        <Form form={form} layout="vertical" onFinish={handleSubmit}>
                            <Form.Item name="name" label="Họ và tên" rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}>
                                <Input placeholder="Nguyễn Văn A" />
                            </Form.Item>
                            <Form.Item name="incentive_id" label="Chương trình ưu đãi" rules={[{ required: true, message: 'Vui lòng chọn chương trình ưu đãi' }]}>
                                <Select placeholder="Chọn chương trình muốn tham gia">
                                    {incentives.map(i => (
                                        <Select.Option key={i.id} value={i.id}>{i.title}</Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>
                            <Form.Item name="oldVehicle" label="Loại phương tiện đang dùng" rules={[{ required: true, message: 'Vui lòng chọn loại phương tiện đang dùng' }]}>
                                <Select placeholder="Chọn loại xe đang dùng">
                                    <Select.Option value="motorbike">Xe máy</Select.Option>
                                    <Select.Option value="sedan">Ô tô</Select.Option>
                                </Select>
                            </Form.Item>
                            <Form.Item name="plate" label="Biển số xe" rules={[{ required: true, message: 'Vui lòng nhập biển số xe' }]}>
                                <Input placeholder="51A-123.45" />
                            </Form.Item>
                            <Form.Item name="newVehicle" label="Mẫu xe điện dự kiến đổi" rules={[{ required: true, message: 'Vui lòng chọn mẫu xe điện' }]}>
                                <Select placeholder="Chọn mẫu xe điện">
                                    {evModels.map(model => (
                                        <Select.Option key={model.id} value={model.name}>{model.name}</Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>
                            <Button type="primary" htmlType="submit" block size="large" loading={loading} style={{ marginTop: 16, height: 50, borderRadius: 10 }}>
                                Gửi hồ sơ đăng ký
                            </Button>
                        </Form>
                        <Alert
                            style={{ marginTop: 24 }}
                            message="Ưu đãi chuyển đổi phương tiện"
                            description="Người dùng đăng ký chuyển đổi từ xe xăng sang xe điện sẽ được hỗ trợ và nhận các ưu đãi hấp dẫn từ chương trình."
                            showIcon
                        />
                    </Card>
                </Col>

                {/* Vehicle Showcase */}
                <Col span={24}>
                    <div style={{ marginBottom: 10 }}>
                        <Title level={2} style={{ marginBottom: 10, fontSize: 36 }}>Các mẫu xe điện phổ biến</Title>
                        <Row gutter={[24, 24]}>
                            {evModels.map((car, index) => (
                                <Col xs={24} sm={12} lg={6} key={index}>
                                    <motion.div
                                        initial={{ opacity: 0, y: 30 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: index * 0.1 }}
                                        style={{ height: '100%' }}
                                    >
                                        <Card
                                            hoverable
                                            cover={
                                                car.image_url ? (
                                                    <img alt={car.name} src={car.image_url} style={{ height: 200, objectFit: 'cover' }} />
                                                ) : null
                                            }
                                            style={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 20, overflow: 'hidden' }}
                                            bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                                        >
                                            <Title level={4}>{car.name}</Title>
                                            <div style={{ marginBottom: 16 }}>
                                                <Text type="secondary" style={{ display: 'block' }}>Giá từ</Text>
                                                <Text strong style={{ fontSize: 20, color: '#f5222d' }}>{car.price}</Text>
                                            </div>
                                            <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
                                                <Col span={12}>
                                                    <div style={{ background: '#f5f5f5', padding: '8px', borderRadius: 8, textAlign: 'center' }}>
                                                        <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Tầm hoạt động</Text>
                                                        <Text strong>{car.range}</Text>
                                                    </div>
                                                </Col>
                                                <Col span={12}>
                                                    <div style={{ background: '#f5f5f5', padding: '8px', borderRadius: 8, textAlign: 'center' }}>
                                                        <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Pin</Text>
                                                        <Text strong>{car.battery}</Text>
                                                    </div>
                                                </Col>
                                            </Row>
                                            <Button type="primary" block style={{ marginTop: 'auto', borderRadius: 10 }} onClick={() => {
                                                setSelectedCar(car);
                                                setIsModalOpen(true);
                                            }}>
                                                Xem chi tiết
                                            </Button>
                                        </Card>
                                    </motion.div>
                                </Col>
                            ))}
                        </Row>
                    </div>
                </Col>
            </Row>

            <Modal
                title={<Title level={3} style={{ margin: 0 }}>{selectedCar?.name}</Title>}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={[
                    <Button key="close" type="primary" size="large" onClick={() => setIsModalOpen(false)} style={{ borderRadius: 10 }}>
                        Đóng
                    </Button>
                ]}
                width={700}
                centered
                style={{ borderRadius: 24 }}
            >
                {selectedCar && (
                    <Row gutter={[24, 24]}>
                        <Col span={24}>
                            {selectedCar.image_url && (
                                <img
                                    src={selectedCar.image_url}
                                    alt={selectedCar.name}
                                    style={{ width: '100%', borderRadius: 20, marginBottom: 20 }}
                                />
                            )}
                            <Paragraph style={{ fontSize: 16, lineHeight: '1.6' }}>
                                {selectedCar.description}
                            </Paragraph>
                        </Col>
                        <Col span={12}>
                            <Card size="small" title="Thông số pin & Quãng đường" bordered={false} style={{ background: '#f6ffed', borderRadius: 16 }}>
                                <Statistic title="Dung lượng pin" value={selectedCar.battery} />
                                <Statistic title="Quãng đường (WLTP)" value={selectedCar.range} icon={<ArrowRightOutlined />} style={{ marginTop: 12 }} />
                            </Card>
                        </Col>
                        <Col span={12}>
                            <Card size="small" title="Giá niêm yết" bordered={false} style={{ background: '#fff1f0', borderRadius: 16 }}>
                                <Statistic title="Giá khởi điểm" value={selectedCar.price} valueStyle={{ color: '#f5222d' }} />
                                <div style={{ marginTop: 12 }}>
                                    <Tag color="green">Miễn 100% lệ phí trước bạ</Tag>
                                </div>
                            </Card>
                        </Col>
                        <Col span={24}>
                            <Title level={4}>Thông số kỹ thuật khác</Title>
                            <List
                                size="small"
                                dataSource={selectedCar.specs}
                                renderItem={item => (
                                    <List.Item>
                                        <Text type="secondary">{item.label}</Text>
                                        <Text strong>{item.value}</Text>
                                    </List.Item>
                                )}
                            />
                        </Col>
                    </Row>
                )}
            </Modal>
        </div>
    );
};

export default SupportPage;
