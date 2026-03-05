import React, { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Typography, Button, Form, Input, Select, Space, Divider, Tag, Statistic, Alert, Modal, List } from 'antd';
import {
    ThunderboltOutlined,
    CarOutlined,
    DollarOutlined,
    CheckCircleOutlined,
    ArrowRightOutlined,
    SafetyCertificateOutlined,
    GlobalOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { message } from 'antd';
import incentiveService from '../../api/incentiveService';
import { useAuthStore } from '../../store/authStore';

const { Title, Text, Paragraph } = Typography;

const SupportPage = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [incentives, setIncentives] = useState([]);
    const [mileage, setMileage] = useState(50); // km/day
    const [fuelPrice, setFuelPrice] = useState(24000); // VNĐ/liter
    const [evPrice, setEvPrice] = useState(3000); // VNĐ/kWh
    const [selectedCar, setSelectedCar] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { user } = useAuthStore();

    useEffect(() => {
        const fetchIncentives = async () => {
            try {
                const data = await incentiveService.getAll();
                setIncentives(data);
            } catch (error) {
                console.error('Failed to fetch incentives');
            }
        };
        fetchIncentives();
    }, []);

    const costData = useMemo(() => {
        const data = [];
        const monthlyKm = mileage * 30;
        const gasConsumption = 8 / 100; // 8L/100km
        const evConsumption = 15 / 100; // 15kWh/100km

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

    // Native benefits replaced by DB incentives

    const carList = [
        {
            name: 'VinFast VF5 Plus',
            price: '468,000,000đ',
            range: '300km',
            battery: '37.23 kWh',
            specs: [
                { label: 'Tăng tốc 0-100km/h', value: '10.9s' },
                { label: 'Công suất tối đa', value: '100kW (134hp)' },
                { label: 'Mô-men xoắn cực đại', value: '135Nm' },
                { label: 'Dẫn động', value: 'Cầu trước (FWD)' },
                { label: 'Thời gian sạc nhanh (10-70%)', value: '30 phút' }
            ],
            description: 'Dòng xe SUV hạng A trẻ trung, hiện đại và tối ưu chi phí vận hành cho đô thị.'
        },
        {
            name: 'VinFast VF6',
            price: '675,000,000đ',
            range: '399km',
            battery: '59.6 kWh',
            specs: [
                { label: 'Tăng tốc 0-100km/h', value: '8.5s' },
                { label: 'Công suất tối đa', value: '150kW (201hp)' },
                { label: 'Mô-men xoắn cực đại', value: '310Nm' },
                { label: 'Dẫn động', value: 'Cầu trước (FWD)' },
                { label: 'Thời gian sạc nhanh (10-70%)', value: '25 phút' }
            ],
            description: 'SUV hạng B thông minh với thiết kế từ Pininfarina, cân bằng hoàn hảo giữa hiệu năng và tiện nghi.'
        },
        {
            name: 'VinFast VF8',
            price: '1,090,000,000đ',
            range: '471km',
            battery: '88.8 kWh',
            specs: [
                { label: 'Tăng tốc 0-100km/h', value: '5.5s' },
                { label: 'Công suất tối đa', value: '300kW (402hp)' },
                { label: 'Mô-men xoắn cực đại', value: '620Nm' },
                { label: 'Dẫn động', value: '2 cầu (AWD)' },
                { label: 'Thời gian sạc nhanh (10-70%)', value: '24 phút' }
            ],
            description: 'Dòng SUV điện cao cấp toàn cầu với sức mạnh vượt trội và trang bị an toàn chuẩn 5 sao.'
        },
        {
            name: 'Hyundai IONIQ 5',
            price: '1,300,000,000đ',
            range: '450km',
            battery: '72.6 kWh',
            specs: [
                { label: 'Tăng tốc 0-100km/h', value: '7.4s' },
                { label: 'Công suất tối đa', value: '160kW (214hp)' },
                { label: 'Mô-men xoắn cực đại', value: '350Nm' },
                { label: 'Dẫn động', value: 'Cầu sau (RWD)' },
                { label: 'Thời gian sạc nhanh (10-80%)', value: '18 phút (với sạc 350kW)' }
            ],
            description: 'Kiệt tác thiết kế Retro-futuristic cùng nền tảng E-GMP đột phá từ Hàn Quốc.'
        },
    ];

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
        <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 100 }}>
            {/* Hero Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ textAlign: 'center', marginBottom: 64, backgroundImage: 'linear-gradient(rgba(24, 144, 255, 0.05), rgba(255, 255, 255, 0))', padding: '60px 20px', borderRadius: 40 }}
            >
                <Tag color="processing" style={{ borderRadius: 10, padding: '4px 12px', fontSize: 14, marginBottom: 16 }}>Xanh hóa giao thông</Tag>
                <Title level={1}>Hỗ Trợ Chuyển Đổi Xe Điện</Title>
                <Paragraph style={{ fontSize: 18, color: '#595959', maxWidth: 800, margin: '0 auto' }}>
                    Khám phá những ưu đãi từ Chính phủ, so sánh chi phí vận hành và tìm hiểu các mẫu xe điện phù hợp nhất với nhu cầu của bạn.
                </Paragraph>
            </motion.div>

            <Row gutter={[32, 32]}>
                {/* Benefits Section */}
                <Col span={24}>
                    <Title level={2}><CheckCircleOutlined /> Chính Sách Ưu Đãi Hiện Có</Title>
                    <Row gutter={[16, 16]}>
                        {incentives.length > 0 ? incentives.map((item, index) => (
                            <Col xs={24} md={8} key={index}>
                                <motion.div whileHover={{ y: -5 }}>
                                    <Card hoverable style={{ minHeight: 220, border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', borderRadius: 20 }}>
                                        <div style={{ fontSize: 32, marginBottom: 16 }}>
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
                    <Card title="So Sánh Chi Phí Vận Hành (5 Năm)" bordered={false} style={{ height: '100%', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
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
                    <Card title="Đăng Ký Hỗ Trợ Chuyển Đổi" bordered={false} style={{ height: '100%', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                        <Form form={form} layout="vertical" onFinish={handleSubmit}>
                            <Form.Item name="name" label="Họ và tên" rules={[{ required: true }]}>
                                <Input placeholder="Nguyễn Văn A" />
                            </Form.Item>
                            <Form.Item name="incentive_id" label="Chương trình ưu đãi" rules={[{ required: true }]}>
                                <Select placeholder="Chọn chương trình muốn tham gia">
                                    {incentives.map(i => (
                                        <Select.Option key={i.id} value={i.id}>{i.title}</Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>
                            <Form.Item name="oldVehicle" label="Loại phương tiện cũ" rules={[{ required: true }]}>
                                <Select placeholder="Chọn loại xe xăng đang dùng">
                                    <Select.Option value="motorbike">Xe máy xăng</Select.Option>
                                    <Select.Option value="sedan">Ô tô Sedan/Hatchback</Select.Option>
                                    <Select.Option value="suv">Ô tô SUV/CUV</Select.Option>
                                    <Select.Option value="truck">Xe tải nhỏ</Select.Option>
                                </Select>
                            </Form.Item>
                            <Form.Item name="plate" label="Biển số xe cũ" rules={[{ required: true }]}>
                                <Input placeholder="VD: 51A-123.45" />
                            </Form.Item>
                            <Form.Item name="newVehicle" label="Mẫu xe điện dự kiến đổi" rules={[{ required: true }]}>
                                <Select placeholder="Chọn mẫu xe điện">
                                    <Select.Option value="VinFast VF5 Plus">VinFast VF5 Plus</Select.Option>
                                    <Select.Option value="VinFast VF6">VinFast VF6</Select.Option>
                                    <Select.Option value="VinFast VF8">VinFast VF8</Select.Option>
                                    <Select.Option value="Hyundai IONIQ 5">Hyundai IONIQ 5</Select.Option>
                                </Select>
                            </Form.Item>
                            <Button type="primary" htmlType="submit" block size="large" loading={loading} style={{ marginTop: 16, height: 50, borderRadius: 10 }}>
                                Gửi Hồ Sơ Đăng Ký
                            </Button>
                        </Form>
                        <Alert
                            style={{ marginTop: 24 }}
                            message="Ưu đãi chuyển dịch"
                            description="Hồ sơ được duyệt sẽ nhận được voucher 20tr VNĐ khi mua xe điện mới."
                            showIcon
                        />
                    </Card>
                </Col>

                {/* Vehicle Showcase */}
                <Col span={24}>
                    <Title level={2}><CarOutlined /> Các Mẫu Xe Điện Phổ Biến</Title>
                    <Row gutter={[16, 16]}>
                        {carList.map((car, index) => (
                            <Col xs={24} sm={12} lg={6} key={index}>
                                <Card
                                    hoverable
                                    cover={<img alt={car.name} src={`https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=800&q=80`} />}
                                    actions={[
                                        <Button
                                            type="link"
                                            key="details"
                                            onClick={() => {
                                                setSelectedCar(car);
                                                setIsModalOpen(true);
                                            }}
                                        >
                                            Chi tiết
                                        </Button>
                                    ]}
                                >
                                    <Card.Meta
                                        title={car.name}
                                        description={
                                            <Space direction="vertical" style={{ width: '100%' }}>
                                                <Text strong style={{ color: '#f5222d', fontSize: 16 }}>{car.price}</Text>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <Tag icon={<ArrowRightOutlined />}>{car.range}</Tag>
                                                    <Tag icon={<ThunderboltOutlined />}>{car.battery}</Tag>
                                                </div>
                                            </Space>
                                        }
                                    />
                                </Card>
                            </Col>
                        ))}
                    </Row>
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
                            <img
                                src={`https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=800&q=80`}
                                alt={selectedCar.name}
                                style={{ width: '100%', borderRadius: 20, marginBottom: 20 }}
                            />
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
