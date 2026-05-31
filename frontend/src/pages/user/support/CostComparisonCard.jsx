import React from 'react';
import { Col, Card, Typography, Input, Row, Divider, Statistic } from 'antd';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const { Text } = Typography;

const CostComparisonCard = ({
    costData,
    mileage,
    fuelPrice,
    evPrice,
    savingsPerMonth,
    setMileage,
    setFuelPrice,
    setEvPrice
}) => {
    return (
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
                        <Statistic
                            title="Giảm phát thải CO2"
                            value={(mileage * 30 * 12 * 0.2 / 1000).toFixed(1)}
                            suffix="Tấn/năm"
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Col>
                </Row>
            </Card>
        </Col>
    );
};

export default CostComparisonCard;
