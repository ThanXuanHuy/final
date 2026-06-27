import React, { useState } from 'react';
import { Col, Card, Typography, Input, Row, Divider, Statistic, Select, Button } from 'antd';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const { Text, Paragraph } = Typography;
const { Option } = Select;

const CostComparisonCard = () => {
    const [vehicleType, setVehicleType] = useState('car');
    const [mileage, setMileage] = useState('');
    const [fuelPrice, setFuelPrice] = useState('');
    const [evPrice, setEvPrice] = useState('');
    const [gasCondition, setGasCondition] = useState('new');
    const [evCondition, setEvCondition] = useState('new');

    const [gasMaintenanceCost, setGasMaintenanceCost] = useState('');
    const [evMaintenanceCost, setEvMaintenanceCost] = useState('');

    const handleNumberChange = (setter) => (e) => {
        const val = e.target.value;
        if (val === '' || Number(val) >= 0) {
            setter(val);
        }
    };

    const [results, setResults] = useState(null);

    const gasConsumptions = {
        motor: { new: 2.0, used: 2.5, old: 3.0 },
        car: { new: 7.0, used: 8.5, old: 10.0 }
    };

    const evConsumptions = {
        motor: { new: 2.5, used: 3.0, old: 4.0 },
        car: { new: 15.0, used: 18.0, old: 21.0 }
    };

    const handleCalculate = () => {
        const monthlyKm = Number(mileage) || 0;
        const gasConsumptionRate = gasConsumptions[vehicleType][gasCondition] / 100;
        const evConsumptionRate = evConsumptions[vehicleType][evCondition] / 100;

        const gasCost = (monthlyKm * gasConsumptionRate * (Number(fuelPrice) || 0)) + (Number(gasMaintenanceCost) || 0);
        const evCost = (monthlyKm * evConsumptionRate * (Number(evPrice) || 0)) + (Number(evMaintenanceCost) || 0);
        const saveMonth = gasCost - evCost;
        const saveYear = saveMonth * 12;

        const data = [{
            month: '0',
            gas: 0,
            ev: 0
        }];
        for (let i = 1; i <= 12; i++) {
            data.push({
                month: `${i}`,
                gas: Math.round(gasCost * i),
                ev: Math.round(evCost * i),
            });
        }

        setResults({
            monthlyGasCost: gasCost,
            monthlyEvCost: evCost,
            savingsPerMonth: saveMonth,
            savingsPerYear: saveYear,
            costData: data
        });
    };

    return (
        <Col xs={24} lg={16}>
            <Card title="So sánh chi phí vận hành" bordered={false} style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                <Row gutter={24} style={{ marginBottom: 24 }}>

                    <Col xs={24} md={12} style={{ marginBottom: 16 }}>
                        <Text strong>Loại phương tiện</Text>
                        <Select value={vehicleType} onChange={setVehicleType} style={{ width: '100%' }}>
                            <Option value="motor">Xe máy</Option>
                            <Option value="car">Ô tô</Option>
                        </Select>
                    </Col>
                    <Col xs={24} md={12} style={{ marginBottom: 16 }}>
                        <Text strong>Quãng đường di chuyển (km)</Text>
                        <Input type="number" min={0} placeholder="Ví dụ: 1000" value={mileage} onChange={handleNumberChange(setMileage)} />
                    </Col>

                    <Col xs={24} md={12} style={{ marginBottom: 16 }}>
                        <Card size="small" title="Xe Xăng" bordered={true} style={{ background: '#fff1f0', borderColor: '#ffa39e' }}>
                            <div style={{ marginBottom: 16 }}>
                                <Text strong>Giá xăng (VNĐ/Lít)</Text>
                                <Input type="number" min={0} placeholder="Ví dụ: 24000" value={fuelPrice} onChange={handleNumberChange(setFuelPrice)} />
                            </div>
                            <div style={{ marginBottom: 16 }}>
                                <Text strong>Chi phí bảo dưỡng/tháng (VNĐ)</Text>
                                <Input type="number" min={0} placeholder="Ví dụ: 200000" value={gasMaintenanceCost} onChange={handleNumberChange(setGasMaintenanceCost)} />
                            </div>
                            <div>
                                <Text strong>Thời gian sử dụng</Text>
                                <Select value={gasCondition} onChange={setGasCondition} style={{ width: '100%' }}>
                                    <Option value="new">Dưới 2 năm</Option>
                                    <Option value="used">Từ 2 - 5 năm</Option>
                                    <Option value="old">Trên 5 năm</Option>
                                </Select>
                            </div>
                        </Card>
                    </Col>

                    <Col xs={24} md={12} style={{ marginBottom: 16 }}>
                        <Card size="small" title="Xe Điện" bordered={true} style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
                            <div style={{ marginBottom: 16 }}>
                                <Text strong>Giá điện (VNĐ/kWh)</Text>
                                <Input type="number" min={0} placeholder="Ví dụ: 3000" value={evPrice} onChange={handleNumberChange(setEvPrice)} />
                            </div>
                            <div style={{ marginBottom: 16 }}>
                                <Text strong>Chi phí bảo dưỡng/tháng (VNĐ)</Text>
                                <Input type="number" min={0} placeholder="Ví dụ: 50000" value={evMaintenanceCost} onChange={handleNumberChange(setEvMaintenanceCost)} />
                            </div>
                            <div>
                                <Text strong>Thời gian sử dụng</Text>
                                <Select value={evCondition} onChange={setEvCondition} style={{ width: '100%' }}>
                                    <Option value="new">Dưới 2 năm</Option>
                                    <Option value="used">Từ 2 - 5 năm</Option>
                                    <Option value="old">Trên 5 năm</Option>
                                </Select>
                            </div>
                        </Card>
                    </Col>
                </Row>

                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <Button type="primary" size="large" onClick={handleCalculate} style={{ minWidth: 200, height: 45, borderRadius: 8 }}>
                        Tính toán chi phí
                    </Button>
                </div>

                {results && (
                    <>
                        <div style={{ position: 'relative', height: 350, marginBottom: 20 }}>
                            <Text type="secondary" style={{ position: 'absolute', top: -10, left: 10, fontSize: 12, zIndex: 1 }}>
                                (Đơn vị: Triệu VNĐ)
                            </Text>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={results.costData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
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
                                    <XAxis dataKey="month" label={{ value: 'Tháng', position: 'insideBottomRight', offset: -5 }} tickFormatter={(val) => val === '0' ? '' : val} />
                                    <YAxis tickFormatter={(val) => `${val / 1000000}`} />
                                    <Tooltip formatter={(val) => new Intl.NumberFormat('vi-VN').format(Number(val)) + ' VNĐ'} />
                                    <Legend />
                                    <Area type="monotone" name="Xe Xăng" dataKey="gas" stroke="#ff4d4f" fillOpacity={1} fill="url(#colorGas)" />
                                    <Area type="monotone" name="Xe Điện" dataKey="ev" stroke="#52c41a" fillOpacity={1} fill="url(#colorEv)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        <Divider />

                        <Row gutter={24}>
                            <Col span={12} md={6}>
                                <Statistic title="Chi phí xe xăng/tháng" value={results.monthlyGasCost} suffix="VNĐ" valueStyle={{ color: '#ff4d4f', fontSize: '18px' }} formatter={val => new Intl.NumberFormat('vi-VN').format(Math.round(val))} />
                            </Col>
                            <Col span={12} md={6}>
                                <Statistic title="Chi phí xe điện/tháng" value={results.monthlyEvCost} suffix="VNĐ" valueStyle={{ color: '#52c41a', fontSize: '18px' }} formatter={val => new Intl.NumberFormat('vi-VN').format(Math.round(val))} />
                            </Col>
                            <Col span={12} md={6}>
                                <Statistic title="Tiết kiệm mỗi tháng" value={results.savingsPerMonth > 0 ? results.savingsPerMonth : 0} suffix="VNĐ" valueStyle={{ color: '#1890ff', fontSize: '18px' }} formatter={val => new Intl.NumberFormat('vi-VN').format(Math.round(val))} />
                            </Col>
                            <Col span={12} md={6}>
                                <Statistic title="Tiết kiệm mỗi năm" value={results.savingsPerYear > 0 ? results.savingsPerYear : 0} suffix="VNĐ" valueStyle={{ color: '#1890ff', fontSize: '18px', fontWeight: 'bold' }} formatter={val => new Intl.NumberFormat('vi-VN').format(Math.round(val))} />
                            </Col>
                        </Row>

                        <Paragraph type="secondary" style={{ marginTop: 20, fontSize: '13px', fontStyle: 'italic', textAlign: 'center' }}>
                            * Kết quả tính toán mang tính tham khảo nhằm hỗ trợ người dùng ước tính chi phí vận hành giữa xe xăng và xe điện. Chi phí thực tế có thể thay đổi tùy theo điều kiện sử dụng của từng phương tiện.
                        </Paragraph>
                    </>
                )}
            </Card>
        </Col>
    );
};

export default CostComparisonCard;

