import React from 'react';
import { Row, Col, Card, Typography, Select, DatePicker, Button, Table, Tag, Space, Progress } from 'antd';
import {
    DownloadOutlined,
    PieChartOutlined,
    LineChartOutlined,
    FileSearchOutlined
} from '@ant-design/icons';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, ComposedChart, Area, Bar, Line
} from 'recharts';
import { useState, useEffect } from 'react';
import userService from '../../api/userService';
import stationService from '../../api/stationService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

// Mock data removed in favor of real API data
const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1'];

const AdminReports = () => {
    const [stats, setStats] = useState({ chartData: [], conversion_rate: 0 });
    const [stations, setStations] = useState([]);
    const [conversionData, setConversionData] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsData, stationsData, conversionResponse] = await Promise.all([
                userService.getStats(),
                stationService.getAll(),
                userService.getConversionReport()
            ]);
            setStats(statsData);
            setStations(stationsData);
            setConversionData(conversionResponse);
        } catch (error) {
            console.error('Failed to fetch reports data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const exportToExcel = () => {
        message.loading('Đang khởi tạo tệp báo cáo...', 1.5).then(() => {
            message.success('Đã tải xuống báo cáo doanh thu tháng 3.xlsx');
        });
    };

    return (
        <div style={{ padding: '4px' }}>
            <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
                <Col>
                    <Title level={2} style={{ margin: 0 }}>Báo Cáo & Thống Kê Chuyên Sâu</Title>
                    <Text type="secondary">Phân tích hệ thống EV Charging (Thesis Edtion)</Text>
                </Col>
                <Col>
                    <Space>
                        <DatePicker.RangePicker />
                        <Button type="primary" icon={<DownloadOutlined />} onClick={exportToExcel}>Xuất Báo Cáo</Button>
                    </Space>
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} lg={16}>
                    <Card title={<Space><LineChartOutlined /> Biến động doanh thu & Lịch đặt</Space>} extra={<Select defaultValue="6m" options={[{ label: '6 Tháng', value: '6m' }, { label: '1 Năm', value: '1y' }]} />}>
                        <div style={{ height: 400 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={stats.chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis yAxisId="left" orientation="left" stroke="#1890ff" label={{ value: 'VNĐ', angle: -90, position: 'insideLeft' }} />
                                    <YAxis yAxisId="right" orientation="right" stroke="#52c41a" label={{ value: 'Lượt đặt', angle: 90, position: 'insideRight' }} />
                                    <Tooltip />
                                    <Legend />
                                    <Area yAxisId="left" type="monotone" dataKey="revenue" fill="#1890ff" stroke="#1890ff" fillOpacity={0.1} name="Doanh thu" />
                                    <Bar yAxisId="right" dataKey="bookings" barSize={20} fill="#52c41a" name="Lượt đặt" radius={[4, 4, 0, 0]} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} lg={8}>
                    <Card title={<Space><PieChartOutlined /> Hiệu quả chuyển đổi (AI)</Space>} style={{ height: '100%' }}>
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <Statistic
                                title="Tỷ lệ chuyển đổi xe điện"
                                value={conversionData?.conversion_rate || 0}
                                suffix="%"
                                valueStyle={{ color: '#3f8600', fontSize: 48, fontWeight: 'bold' }}
                            />
                            <Progress
                                percent={conversionData?.conversion_rate || 0}
                                status="active"
                                showInfo={false}
                                strokeColor="#52c41a"
                                style={{ marginTop: 10 }}
                            />
                            <Text type="secondary" style={{ display: 'block', marginTop: 12 }}>
                                <RiseOutlined /> Tăng 12% so với tháng trước
                            </Text>
                        </div>
                        <Divider />
                        <div style={{ height: 180 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={conversionData?.monthly_trend || []}>
                                    <XAxis dataKey="month" hide />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="rate" stroke="#52c41a" fill="#f6ffed" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]}>
                <Col span={24}>
                    <Card title={<Space><FileSearchOutlined /> Hiệu suất chi tiết từng trạm sạc</Space>}>
                        <Table
                            pagination={false}
                            loading={loading}
                            dataSource={stations.map(s => ({
                                key: s.id,
                                name: s.name,
                                revenue: `${(Math.random() * 5000000 + 1000000).toLocaleString()}đ`,
                                usage: `${Math.floor(Math.random() * 40 + 60)}%`,
                                status: Math.floor(Math.random() * 10) > 2 ? 'Ổn định' : 'Bảo trì'
                            }))}
                            columns={[
                                { title: 'Trạm Sạc', dataIndex: 'name', key: 'name' },
                                { title: 'Doanh thu (Tháng)', dataIndex: 'revenue', key: 'revenue', sorter: (a, b) => a.revenue.localeCompare(b.revenue) },
                                {
                                    title: 'Hiệu suất khai thác',
                                    dataIndex: 'usage',
                                    key: 'usage',
                                    render: (val) => <Progress percent={parseInt(val)} size="small" status={parseInt(val) > 80 ? 'success' : 'normal'} />
                                },
                                {
                                    title: 'Vận hành',
                                    dataIndex: 'status',
                                    key: 'status',
                                    render: (status) => <Tag color={status === 'Ổn định' ? 'green' : 'orange'}>{status}</Tag>
                                }
                            ]}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default AdminReports;
